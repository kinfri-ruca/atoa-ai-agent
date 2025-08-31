// public/script.js

// 카카오맵 API 키
const KAKAO_MAP_KEY = 'e5f5b4a70e19433ba3b5a0b8bb9ed7ef';

// Firebase Functions API URL: 배포 후 Firebase 콘솔에서 실제 URL로 변경해야 합니다.
const API_BASE_URL = 'https://dikovina.online';

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
                // 기본 마커 이미지는 카카오맵의 기본 마커를 사용합니다.
                const defaultImageSrc = './icons8-location-96.png';
                let markerImage;
                let opacity;

                // ⭐ 그룹화된 마커인지 여부를 확인
                const isGrouped = academy.isGrouped;
                
                if (isGrouped) {
                    // 그룹화된 마커일 경우, 이미지를 더 크게 만듭니다.
                    const defaultImageSrc = './icons9-96.png';
                    const groupedImageSize = new kakao.maps.Size(46, 50);
                    markerImage = new kakao.maps.MarkerImage(defaultImageSrc, groupedImageSize);
                    opacity = 0.9;
                } else {
                    // 단일 마커일 경우, 평판 데이터 유무에 따라 크기를 조절합니다.
                    const currentImageSize = academy.reputationData ? new kakao.maps.Size(46, 50) : new kakao.maps.Size(36, 40);
                    markerImage = new kakao.maps.MarkerImage(defaultImageSrc, currentImageSize);
                    
                    // 평판 데이터 유무에 따라 투명도 설정
                    opacity = academy.reputationData ? 1.0 : 0.5;
                }
                
                const marker = new kakao.maps.Marker({
                    position: new kakao.maps.LatLng(academy.lat, academy.lng),
                    map: map,
                    image: markerImage, // 마커 생성 시 이미지를 항상 명시합니다.
                    opacity: opacity
                });
                
                marker.academyData = academy;

                // ⭐ 마커 클릭 이벤트 리스너
                kakao.maps.event.addListener(marker, 'click', function() {
                    if (this.academyData.isGrouped) {
                        // console.log(`Grouped marker clicked with data:`, this.academyData.groupedData);
                        displayGroupedAcademiesPopup(this.academyData.groupedData);
                    } else {
                        // console.log(`Single marker clicked with data:`, this.academyData);
                        displayAcademyDetail(this.academyData);
                    }
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

// 🚩 그룹화된 학원 목록을 팝업에 표시하는 함수
function displayGroupedAcademiesPopup(academies) {
    const popup = document.getElementById('grouped-academies-popup');
    const listContainer = document.getElementById('grouped-academies-list');
    
    if (!popup || !listContainer) {
        console.error("Grouped academies popup elements not found.");
        return;
    }

    listContainer.innerHTML = ''; // 기존 목록 초기화

    // 각 학원 정보를 목록에 추가
    academies.forEach(academy => {
        const academyItem = document.createElement('div');
        academyItem.classList.add('academy-item');
        
        // 평판 점수가 있으면 강조하고, 없으면 반투명하게 표시
        const hasReputation = academy.reputationData;
        if (hasReputation) {
            academyItem.classList.add('reputation-academy');
        }

        academyItem.innerHTML = `
            <h3>${academy.ACA_NM}</h3>
            ${hasReputation ? `<p><strong>평판 점수:</strong> ${academy.reputationData.reputation_score_100.toFixed(2)}</p>` : `<p>평판 점수 없음</p>`}
        `;

        // ⭐ 각 항목 클릭 시 상세 정보 팝업
        academyItem.addEventListener('click', () => {
            displayAcademyDetail(academy);
            popup.classList.add('hidden'); // 그룹 팝업 닫기
        });

        listContainer.appendChild(academyItem);
    });

    // 팝업 표시
    popup.classList.remove('hidden');
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
    //detailAddress.textContent = academy.ADDR || '정보 없음'; // FA_RDNMA 대신 ADDR 사용
    detailAddress.textContent = academy.FA_RDNMA;
    detailPhone.textContent = academy.FA_TELNO;
    detailCourse.textContent = academy.LE_CRSE_NM;
    detailLat.textContent = academy.lat || '정보 없음';
    detailLng.textContent = academy.lng || '정보 없음';

    if (academy.reputationData && academy.reputationData.reputation_score_100) {
        const score = parseFloat(academy.reputationData.reputation_score_100);
        detailAIScore.textContent = `${score.toFixed(2)} / 100`;
        academyDetail.style.opacity = 1.0; 
    } else {
        detailAIScore.textContent = '정보 없음';
        academyDetail.style.opacity = 0.75;
    }

    const academyName = academy.ACA_NM;
    detailName.textContent = academyName;

    if (academyName && academyName.trim() !== '') {
        detailName.style.cursor = 'pointer';
        detailName.onclick = () => {
            window.open(`dashboard.html?name=${encodeURIComponent(academyName)}`, '_blank');
        };
    } else {
        detailName.style.cursor = 'default';
        detailName.onclick = null;
    }
    
    academyDetail.classList.add('visible');
    academyDetail.classList.remove('hidden');
}

// 🚩 행정구역 검색 및 지도 이동 함수가 추가된 부분
function searchAndMoveToDistrict() {
    const districtInput = document.getElementById('district-input');
    const districtSearchButton = document.getElementById('district-search-button');
    
    if (districtSearchButton) {
        districtSearchButton.classList.add('active');
    }

    const districtName = districtInput.value.trim();

    if (!districtName) {
        showPopupMessage('행정구역명을 입력해 주세요.');
        return;
    }

    const geocoder = new kakao.maps.services.Geocoder();

    geocoder.addressSearch(districtName, function(result, status) {
        if (status === kakao.maps.services.Status.OK) {
            const coords = new kakao.maps.LatLng(result[0].y, result[0].x);
            map.setCenter(coords);
            showPopupMessage(`${districtName}으로 지도를 이동합니다.`);
        } else {
            showPopupMessage('입력하신 지역을 찾을 수 없습니다. 정확한 행정구역명을 입력해 주세요.');
        }
        if (districtSearchButton) {
            districtSearchButton.classList.remove('active');
        }
    });
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

        const recommendButtonContainer = document.getElementById('recommend-button-container');
        if (recommendButtonContainer) {
            chatWindow.appendChild(recommendButtonContainer);
            recommendButtonContainer.classList.remove('hidden');
        }
        
    } catch (error) {
        console.error("AI Response Fetch Error:", error);
        if (chatWindow.contains(loadingMessage)) {
            chatWindow.removeChild(loadingMessage);
        }
        addAIMessage('오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    }
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

// 🚩 그룹화된 학원 목록 팝업을 표시하는 함수 (수정)
function displayGroupedAcademiesPopup(academies) {
    console.log('Popup function called with data:', academies);
    const popup = document.getElementById('grouped-academies-popup');
    const listContainer = document.getElementById('grouped-academies-list');

    if (!popup || !listContainer) {
        console.error("Popup function cannot find required elements. Check 'grouped-academies-popup' and 'grouped-academies-list' IDs in index.html");
        return;
    }
    
    // 팝업이 나타나지 않는 문제를 해결하기 위해 display 속성을 직접 설정
    popup.style.display = 'flex';
    popup.classList.remove('hidden');

    listContainer.innerHTML = ''; // 기존 목록 초기화

    // 각 학원 정보를 목록에 추가
    academies.forEach(academy => {
        const academyItem = document.createElement('div');
        academyItem.classList.add('academy-item');

        const hasReputation = academy.reputationData;
        if (hasReputation) {
            academyItem.classList.add('reputation-academy');
        }

        academyItem.innerHTML = `
            <h3>${academy.ACA_NM}</h3>
            ${hasReputation ? `<p><strong>평판 점수:</strong> ${academy.reputationData.reputation_score_100.toFixed(2)}</p>` : `<p>평판 점수 없음</p>`}
        `;

        academyItem.addEventListener('click', () => {
            displayAcademyDetail(academy);
            popup.classList.add('hidden');
        });

        listContainer.appendChild(academyItem);
    });

    // 팝업 닫기 이벤트 리스너는 문서 로드 시 한 번만 설정
    const closeButton = popup.querySelector('.close-button');
    if (!closeButton.hasAttribute('data-listener-added')) {
        closeButton.addEventListener('click', () => {
            popup.classList.add('hidden');
        });
        closeButton.setAttribute('data-listener-added', 'true');
    }
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
    const districtSearchButton = document.getElementById('district-search-button'); 

    // Top 10 버튼 이벤트 리스너
    const top10Button = document.getElementById('top10-button');
        if (top10Button) {
            top10Button.addEventListener('click', function() {
                window.open('top10.html', '_blank');
            });
        }

    if (searchButton) {
        searchButton.addEventListener('click', () => {
            const bounds = map.getBounds();
            const ne = bounds.getNorthEast();
            const sw = bounds.getSouthWest();
            fetchAndDisplayAcademies(ne.getLat(), ne.getLng(), sw.getLat(), sw.getLng());
        });
    }

    if (districtSearchButton) {
        districtSearchButton.addEventListener('click', searchAndMoveToDistrict);
    }

    if (map) {
        kakao.maps.event.addListener(map, 'click', function(mouseEvent) {
            const keywordInput = document.getElementById('keyword-input');
            const districtInput = document.getElementById('district-input');
            const chatInput = document.getElementById('chat-input');
            keywordInput.blur();
            districtInput.blur();
            chatInput.blur();
        });
    }

    if (closeButton) {
        closeButton.addEventListener('click', function() {
            const academyDetail = document.getElementById('academy-detail');
            academyDetail.classList.remove('visible');
        });
    }

    if (aiButton) {
        aiButton.addEventListener('click', function() {
            aiPopup.classList.remove('hidden');
        });
    }

    if (aiCloseButton) {
        aiCloseButton.addEventListener('click', function() {
            aiPopup.classList.add('hidden');
            selectedKeywords = [];
            updateSelectedKeywordsUI();
        });
    }

    if (messageCloseButton) {
        messageCloseButton.addEventListener('click', hidePopupMessage);
    }
    
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

    if (chatSendButton) {
        chatSendButton.addEventListener('click', sendMessage);
    }
    
    if (chatInput) {
        chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    if (goToRecommendButton) {
        goToRecommendButton.addEventListener('click', function() {
            window.location.href = 'recommendation.html';
        });
    }
});

kakao.maps.load(initMap);