문제1.
브라우저 안에서 돌아갈때 메모리 문제로 llmda-3b 등 양자화 안된 6gb 이상의 모델은 구동 불가 
돌파1.
tauri+ollama로 ui는 그대로쓰고 webgpu보다 낫으면서 메모리 제한도 없는 방법으로 가자
(poc이므로 저장은 json, ollama 배포는 별도 알아서)
기존: npm run dev 하나로 개발
변경: npm run tauri:dev (Tauri가 내부적으로 next dev + Tauri 앱을 동시 실행)
순수 UI 작업은 여전히 npm run dev로 브라우저에서 개발 가능 (Ollama 연동 제외)

문제2. 
모델의 한계
돌파2.
언어마다 다른 모델을 사용하는게 좋겠다