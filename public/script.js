// public/script.js

// 카카오맵 API 키
const KAKAO_MAP_KEY = 'e5f5b4a70e19433ba3b5a0b8bb9ed7ef';

// Firebase Functions API URL: 배포 후 Firebase 콘솔에서 실제 URL로 변경해야 합니다.
const API_BASE_URL = 'https://asia-northeast3-atoa-review-maching.cloudfunctions.net/app';

let map;
let markers = [];
let selectedKeywords = []; // 키워드 관리를 위한 전역 변수

// 커스텀 팝업 메시지 관련 함수
function showPopupMessage(message) {
    const messagePopup = document.getElementById('message-popup');
    const messageText = document.getElementById('message-text');
    if (messagePopup && messageText) {
        messageText.textContent = message;
        messagePopup.classList.remove('hidden');
    } else {
        console.error("Popup message elements not found.");
        window.alert(message);
    }
}

function hidePopupMessage() {
    const messagePopup = document.getElementById('message-popup');
    if (messagePopup) {
        messagePopup.classList.add('hidden');
    }
}

// 키워드 UI를 업데이트하는 함수
function updateSelectedKeywordsUI() {
    const selectedKeywordsContainer = document.getElementById('selected-keywords-container');
    if (!selectedKeywordsContainer) return;

    selectedKeywordsContainer.innerHTML = '';
    selectedKeywords.forEach(keyword => {
        const tag = document.createElement('div');
        tag.classList.add('selected-keyword-tag');
        tag.innerHTML = `<span># ${keyword}</span>`;

        tag.addEventListener('click', function() {
            const keywordBtn = document.querySelector(`.keyword-btn[data-keyword="${keyword}"]`);
            if (keywordBtn) {
                keywordBtn.classList.remove('active');
            }
            const index = selectedKeywords.indexOf(keyword);
            if (index > -1) {
                selectedKeywords.splice(index, 1);
            }
            updateSelectedKeywordsUI();
        });
        selectedKeywordsContainer.appendChild(tag);
    });
}

// 교습과정 목록을 가져와 드롭다운을 채우는 함수
async function fetchCourses() {
    const courseSelect = document.getElementById('course-select');
    try {
        const allOption = document.createElement('option');
        allOption.value = "";
        allOption.textContent = "교습과정 전체";
        allOption.selected = true;
        courseSelect.appendChild(allOption);

        const response = await fetch('courses.json');
        if (!response.ok) {
            throw new Error(`Failed to load courses.json: ${response.statusText}`);
        }
        const courses = await response.json();
        courses.forEach(course => {
            const option = document.createElement('option');
            option.value = course;
            option.textContent = course;
            courseSelect.appendChild(option);
        });
    } catch (error) {
        showPopupMessage(`교습과정 목록을 불러오는 데 실패했습니다: ${error.message}`);
    }
}

// API 호출 및 마커 표시 함수
async function fetchAndDisplayAcademies(neLat, neLng, swLat, swLng) {
    const searchButton = document.getElementById('search-button'); // 🚩 검색 버튼 요소 가져오기
    const keywordInput = document.getElementById('keyword-input');
    const courseSelect = document.getElementById('course-select');

     // 🚩 검색 시작 시 버튼 활성화 상태로 변경
    if (searchButton) {
        searchButton.classList.add('active');
    }
      
    try {
        const keyword = keywordInput.value;
        const course = courseSelect.value;
        
        const params = new URLSearchParams({
            keyword: keyword,
            course: course,
            neLat: neLat,
            neLng: neLng,
            swLat: swLat,
            swLng: swLng
        });

        const apiUrl = `${API_BASE_URL}/api/academies?${params.toString()}`;
        console.log("Fetching URL:", apiUrl);
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`API call failed with status: ${response.status}`);
        }
        
        const academies = await response.json();

        if (academies.length === 0) {
            showPopupMessage('현재 지도 화면에 표시할 학원 정보가 없습니다. 지도를 이동하거나 확대/축소해 보세요.');
        }

        markers.forEach(marker => marker.setMap(null));
        markers = [];

        academies.forEach(academy => {
            if (academy.lat && academy.lng) {
                const marker = new kakao.maps.Marker({
                    position: new kakao.maps.LatLng(academy.lat, academy.lng),
                    map: map
                });

                marker.academyData = academy;

                kakao.maps.event.addListener(marker, 'click', function() {
                    displayAcademyDetail(this.academyData);
                });

                markers.push(marker);
            }
        });
    } catch (error) {
        console.error("API Fetch Error:", error);
        showPopupMessage(`API 호출에 실패했습니다. 백엔드 서버 상태를 확인하세요. 오류: ${error.message}`);
     } finally {
        // 🚩 검색이 성공하든 실패하든, 버튼 활성화 상태 해제
        if (searchButton) searchButton.classList.remove('active');
    }
}

// 학원 상세 정보 팝업을 표시하는 함수
function displayAcademyDetail(academy) {
    const academyDetail = document.getElementById('academy-detail');
    const detailName = document.getElementById('detail-name');
    const detailAddress = document.getElementById('detail-address');
    const detailPhone = document.getElementById('detail-phone');
    const detailCourse = document.getElementById('detail-course');
    const detailLat = document.getElementById('detail-lat');
    const detailLng = document.getElementById('detail-lng');
    const detailAIScore = document.getElementById('detail-ai-score');

    if (!academy) {
        showPopupMessage('선택한 마커의 학원 정보가 유효하지 않습니다.');
        return;
    }

    detailName.textContent = academy.ACA_NM;
    detailAddress.textContent = academy.FA_RDNMA;
    detailPhone.textContent = academy.FA_TELNO;
    detailCourse.textContent = academy.LE_CRSE_NM;
    // 🚩 위도, 경도 값 표시
    detailLat.textContent = academy.lat || '정보 없음';
    detailLng.textContent = academy.lng || '정보 없음';
    // 🚩 AI 평판 지수 고정값 표시
    detailAIScore.textContent = '95/100 (개발 중)';
    
    academyDetail.classList.add('visible');
    academyDetail.classList.remove('hidden');
}


// 전송 버튼 클릭 시 메시지를 채팅창에 추가하는 함수
function sendMessage() {
    const chatInput = document.getElementById('chat-input');
    const chatWindow = document.getElementById('ai-chat-display');
    const inputText = chatInput.value.trim();
    
    const combinedMessage = selectedKeywords.length > 0
        ? `#${selectedKeywords.join(' #')} ${inputText}`.trim()
        : inputText;

    if (combinedMessage === '') return;

    const userMessageDiv = document.createElement('div');
    userMessageDiv.classList.add('chat-message', 'user-message');
    userMessageDiv.textContent = combinedMessage;
    chatWindow.appendChild(userMessageDiv);

    chatInput.value = '';
    selectedKeywords = [];
    updateSelectedKeywordsUI();
    chatWindow.scrollTop = chatWindow.scrollHeight;

    fetchAIResponse(combinedMessage);
}

// AI의 응답을 받아 채팅창에 표시하는 함수
function addAIMessage(message) {
    const chatWindow = document.getElementById('ai-chat-display');
    const aiMessageDiv = document.createElement('div');
    aiMessageDiv.classList.add('chat-message', 'ai-message');
    aiMessageDiv.textContent = message;
    chatWindow.appendChild(aiMessageDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// AI 백엔드에 메시지를 전송하고 응답을 받는 비동기 함수 (시뮬레이션 버전)
async function fetchAIResponse(message) {
    const chatWindow = document.getElementById('ai-chat-display');
    const loadingMessage = document.createElement('div');
    loadingMessage.classList.add('chat-message', 'ai-message', 'loading');
    loadingMessage.textContent = '...답변을 생성 중입니다...';
    chatWindow.appendChild(loadingMessage);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    const simulatedResponses = [
        '안녕하세요! 문의하신 내용에 대해 최적의 학원 정보를 찾아보고 있습니다. 잠시만 기다려 주세요.',
        '해당 지역과 키워드를 분석하여 학원을 추천해 드릴게요.',
        '자세한 정보가 필요하시면 추가 질문을 해주세요. 맞춤형 정보를 제공해 드리겠습니다.',
        '말씀하신 학원들의 평판과 특징을 비교 분석해 드릴까요?',
        'AI가 추천하는 학습 플랜을 만들어 드릴 수 있습니다. 어떤 목표를 가지고 계신가요?',
        '현재 지도에 표시된 학원들을 중심으로 리뷰 데이터를 분석하고 있습니다.',
        '최근 긍정적인 평판을 받고 있는 학원들을 정리해 드릴게요.',
        '선생님들의 경력과 후기를 바탕으로 좋은 강사를 찾아드릴 수 있습니다.',
        '다른 사용자들이 많이 찾는 키워드는 "초등 논술", "고등 입시" 등입니다.',
        '궁금한 점을 자유롭게 질문해주세요. 어떤 질문이든 환영입니다!',
    ];

    try {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 1000));
        chatWindow.removeChild(loadingMessage);
        const randomIndex = Math.floor(Math.random() * simulatedResponses.length);
        const randomResponse = simulatedResponses[randomIndex];
        addAIMessage(randomResponse);

        // AI 응답이 끝난 후 버튼 표시
        const recommendButtonContainer = document.getElementById('recommend-button-container');
        if (recommendButtonContainer) {
            // Append to chatWindow instead of just showing it
            chatWindow.appendChild(recommendButtonContainer);
            recommendButtonContainer.classList.remove('hidden'); // Ensure it's visible
        }
        
    } catch (error) {
        console.error("AI Response Fetch Error:", error);
        if (chatWindow.contains(loadingMessage)) {
            chatWindow.removeChild(loadingMessage);
        }
        addAIMessage('오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    }
}

// 🚩 행정구역 검색 및 지도 이동 함수가 추가된 부분
function searchAndMoveToDistrict() {
    const districtInput = document.getElementById('district-input');
    const districtSearchButton = document.getElementById('district-search-button');
    
    // 🚩 지역 이동 시작 시 버튼 활성화
    if (districtSearchButton) {
        districtSearchButton.classList.add('active');
    }

    const districtName = districtInput.value.trim();

    if (!districtName) {
        showPopupMessage('행정구역명을 입력해 주세요.');
        return;
    }

    // 카카오맵 Geocoder API 사용
    const geocoder = new kakao.maps.services.Geocoder();

    geocoder.addressSearch(districtName, function(result, status) {
        if (status === kakao.maps.services.Status.OK) {
            const coords = new kakao.maps.LatLng(result[0].y, result[0].x);
            map.setCenter(coords); // 지도의 중심을 이동
            showPopupMessage(`${districtName}으로 지도를 이동합니다.`);
        } else {
            showPopupMessage('입력하신 지역을 찾을 수 없습니다. 정확한 행정구역명을 입력해 주세요.');
        }
        // 🚩 검색 완료 후 버튼 활성화 상태 해제
        if (districtSearchButton) {
            districtSearchButton.classList.remove('active');
        }
    });
}


// 카카오맵 API 로드 후 실행될 콜백 함수
function initMap() {
    const mapContainer = document.getElementById('map');
    const mapOption = {
        center: new kakao.maps.LatLng(37.4984336900026, 127.060626529084),
        level: 3
    };
    map = new kakao.maps.Map(mapContainer, mapOption);
    
    const bounds = map.getBounds();
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    fetchAndDisplayAcademies(ne.getLat(), ne.getLng(), sw.getLat(), sw.getLng());

    kakao.maps.event.addListener(map, 'idle', function() {
        const newBounds = map.getBounds();
        const newNe = newBounds.getNorthEast();
        const newSw = newBounds.getSouthWest();
        fetchAndDisplayAcademies(newNe.getLat(), newNe.getLng(), newSw.getLat(), newSw.getLng());
    });

    fetchCourses();
}

// 모든 이벤트 리스너를 한 곳에 모아 관리
document.addEventListener('DOMContentLoaded', function() {
    const aiButton = document.getElementById('ai-button');
    const aiPopup = document.getElementById('ai-popup');
    const aiCloseButton = document.getElementById('ai-close-button');
    const messageCloseButton = document.getElementById('message-close-button');
    const searchButton = document.getElementById('search-button');
    const closeButton = document.getElementById('close-button');
    const chatInput = document.getElementById('chat-input');
    const chatSendButton = document.getElementById('chat-send-button');
    const keywordButtons = document.querySelectorAll('.keyword-btn');
    const goToRecommendButton = document.getElementById('go-to-recommendation-button');
    
    // 🚩 행정구역 검색 버튼 이벤트 리스너를 위한 변수 추가
    const districtSearchButton = document.getElementById('district-search-button'); 

    // 검색 버튼 이벤트 리스너
    if (searchButton) {
        searchButton.addEventListener('click', () => {
            const bounds = map.getBounds();
            const ne = bounds.getNorthEast();
            const sw = bounds.getSouthWest();
            fetchAndDisplayAcademies(ne.getLat(), ne.getLng(), sw.getLat(), sw.getLng());
        });
    }

    // 🚩 행정구역 검색 버튼 이벤트 리스너가 추가된 부분
    if (districtSearchButton) {
        districtSearchButton.addEventListener('click', searchAndMoveToDistrict);
    }

    // 🚩 지도 클릭 이벤트 리스너 추가
    if (map) {
        kakao.maps.event.addListener(map, 'click', function(mouseEvent) {
            // 🚩 검색 입력창의 포커스 제거
            const keywordInput = document.getElementById('keyword-input');
            const districtInput = document.getElementById('district-input');
            const chatInput = document.getElementById('chat-input'); // 🚩 chat-input 요소 추가
            keywordInput.blur();
            districtInput.blur();
            chatInput.blur(); // 🚩 chat-input의 포커스 제거
        });
    }

    // 학원 상세 정보 닫기 버튼
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            const academyDetail = document.getElementById('academy-detail');
            academyDetail.classList.remove('visible');
        });
    }

    // AI 버튼 클릭 시 팝업 열기
    if (aiButton) {
        aiButton.addEventListener('click', function() {
            aiPopup.classList.remove('hidden');
        });
    }

    // AI 닫기 버튼 클릭 시 팝업 닫기
    if (aiCloseButton) {
        aiCloseButton.addEventListener('click', function() {
            aiPopup.classList.add('hidden');
            selectedKeywords = [];
            updateSelectedKeywordsUI();
        });
    }

    // 메시지 팝업 닫기 버튼
    if (messageCloseButton) {
        messageCloseButton.addEventListener('click', hidePopupMessage);
    }
    
    // 키워드 버튼 클릭 이벤트 리스너
    keywordButtons.forEach(button => {
        button.addEventListener('click', function() {
            const keyword = button.dataset.keyword;
            button.classList.toggle('active');

            if (button.classList.contains('active')) {
                selectedKeywords.push(keyword);
            } else {
                const index = selectedKeywords.indexOf(keyword);
                if (index > -1) {
                    selectedKeywords.splice(index, 1);
                }
            }
            updateSelectedKeywordsUI();
        });
    });

    // 전송 버튼 클릭
    if (chatSendButton) {
        chatSendButton.addEventListener('click', sendMessage);
    }
    
    // 키보드 입력 이벤트 (Enter로 전송)
    if (chatInput) {
        chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // AI 추천 결과 보러가기 버튼 이벤트 리스너
    if (goToRecommendButton) {
        goToRecommendButton.addEventListener('click', function() {
            window.location.href = 'recommendation.html';
        });
    }
});

// 카카오맵 API가 로딩된 후 initMap 함수를 호출합니다.
kakao.maps.load(initMap);