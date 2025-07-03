console.log('🎓 생기부 분석 전문가 시스템 시작');

// DOM이 로드되면 실행
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM 로드 완료');
    
    // 로딩 화면 숨기기
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        const app = document.getElementById('app');
        
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                if (app) {
                    app.style.display = 'block';
                }
            }, 500);
        }
    }, 2000);
    
    // 파일 업로드 기능
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const analyzeBtn = document.getElementById('analyzeBtn');
    
    if (uploadArea && fileInput) {
        // 클릭으로 파일 선택
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });
        
        // 파일 선택 이벤트
        fileInput.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files.length > 0) {
                console.log('파일 선택됨:', files.length, '개');
                
                // 업로드 영역 업데이트
                uploadArea.innerHTML = `
                    <div class="upload-icon">
                        <i class="fas fa-check-circle" style="color: #4caf50;"></i>
                    </div>
                    <div class="upload-text">
                        ${files.length}개 파일 업로드 완료
                    </div>
                    <div class="upload-hint">
                        ${Array.from(files).map(f => f.name).join(', ')}
                    </div>
                `;
                
                // 분석 버튼 활성화
                if (analyzeBtn) {
                    analyzeBtn.disabled = false;
                }
            }
        });
        
        // 드래그 앤 드롭
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#667eea';
            uploadArea.style.backgroundColor = 'rgba(102, 126, 234, 0.1)';
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.style.borderColor = '#ddd';
            uploadArea.style.backgroundColor = '';
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#ddd';
            uploadArea.style.backgroundColor = '';
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
                fileInput.dispatchEvent(new Event('change'));
            }
        });
    }
    
    // 분석 버튼 클릭
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', () => {
            console.log('🔄 분석 시작!');
            analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 분석 중...';
            analyzeBtn.disabled = true;
            
            // 2초 후 완료 시뮬레이션
            setTimeout(() => {
                analyzeBtn.innerHTML = '<i class="fas fa-check"></i> 분석 완료!';
                console.log('✅ 분석 완료!');
                
                alert('분석이 완료되었습니다! (데모 버전)');
            }, 2000);
        });
    }
    
    console.log('🎯 이벤트 바인딩 완료');
});