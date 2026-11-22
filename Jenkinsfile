pipeline {
  agent any

  environment {
    AWS_REGION = 'ap-southeast-2'
    SONAR_HOST_URL = 'http://localhost:9000'
    IMAGE_TAG = "${BUILD_NUMBER}"
  }

  stages {
    stage('Trivy FS Scan') {
      steps {
        sh 'trivy fs --severity HIGH,CRITICAL --exit-code 0 .'
      }
    }

    stage('SonarQube Analysis') {
      steps {
        withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
          sh '''
            docker run --rm --network host \
              -e SONAR_HOST_URL="${SONAR_HOST_URL}" \
              -e SONAR_TOKEN="${SONAR_TOKEN}" \
              -v "$(pwd):/usr/src" \
              sonarsource/sonar-scanner-cli \
              -Dsonar.projectKey=local-llm-engine \
              -Dsonar.sources=.
          '''
        }
      }
    }

    stage('Build & Trivy Image Scan') {
      steps {
        sh '''
          docker build -t local-llm-engine:${IMAGE_TAG} .
          trivy image --severity HIGH,CRITICAL --exit-code 0 local-llm-engine:${IMAGE_TAG}
        '''
      }
    }

    stage('Update Manifests & Push to main') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'github-token', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_PASS')]) {
          sh '''
            git config user.name "jenkins-bot"
            git config user.email "jenkins@local-llm-engine.local"
            sed -i "s|:latest|:${IMAGE_TAG}|g" k8s/app-manifests.yaml
            git add k8s/app-manifests.yaml
            git commit -m "Update image tag to ${IMAGE_TAG} [skip ci]" || true
            git push "https://${GIT_USER}:${GIT_PASS}@github.com/maazzafar1234/local-llm-engine.git" HEAD:main
          '''
        }
      }
    }
  }
}