import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, getDocs, Timestamp, setLogLevel, doc, getDoc } from 'firebase/firestore';

// --- Firebase Config ---
// These global variables are provided by the environment.
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- QR Code Library ---
const QRCode = ({ text }) => {
    if (!text) return null;
    const qrCodeDataURL = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(text)}`;
    return (
        <div className="text-center p-4 bg-white rounded-lg shadow-md">
            <img src={qrCodeDataURL} alt="QR Code" className="mx-auto" />
            <p className="text-xs text-gray-500 mt-2">스마트폰으로 QR 코드를 스캔하여<br/>안내장 전체 내용을 확인하세요.</p>
        </div>
    );
};


// --- 데이터 및 유틸리티 함수 ---

// 1. 최신 베이스 정보
const baseFullIngredients = {
    'cb1': {
        description: "일반적인 피부 타입에 적합하며, 전반적인 피부 건강 유지에 도움을 주는 크림 베이스",
        type: "크림",
        ingredients: ["정제수", "세틸알코올", "글리세린", "부틸렌글라이콜", "카프릴릭/카프릭트라이글리세라이드", "트라이에틸헥사노인", "글리세릴스테아레이트", "올리브오일", "마카다미아씨오일", "해바라기씨오일", "다이메티콘", "솔비탄세스퀴올리에이트", "팔미틱애씨드", "피이지-100스테아레이트", "우레아", "카프릴릴글라이콜", "알지닌", "카보머", "레몬추출물", "브로콜리추출물", "오이추출물", "자몽씨추출물", "파프리카추출물", "솔비톨", "알란토인", "토코페릴아세테이트", "다이포타슘글리시리제이트", "카프릴하이드록사믹애씨드", "라벤더추출물", "녹차추출물", "다이소듐이디티에이", "모과추출물", "소듐하이알루로네이트", "쌀겨추출물", "알로에베라잎추출물", "포도추출물", "미리스틱애씨드", "글리세릴폴리메타크릴레이트", "아세틸헥사펩타이드-8", "팔미토일트라이펩타이드-1", "바실러스발효여과물"],
        usage: "1. 아침, 저녁 세안 후 스킨과 에센스 다음 단계에서 사용합니다.\n2. 적당량을 덜어 피부결을 따라 부드럽게 펴 바른 후 가볍게 두드려 흡수시켜 줍니다.\n3. 건조함이 심하거나 특별한 케어가 필요한 부위에는 한 번 더 덧발라 줍니다."
    },
    'cb2': {
        description: "민감성 피부를 위해 특별히 설계되었으며, 피부 자극을 최소화하고 진정 효과를 제공하는 크림 베이스",
        type: "크림",
        ingredients: ["정제수", "글리세린", "부틸렌글라이콜", "다이메티콘", "호호바씨오일", "폴리메타크릴아마이드", "세틸알코올", "판테놀", "글리세릴스테아레이트", "알지닌", "카보머", "1,2-헥산다이올", "카프릴릴글라이콜", "C13-14아이소알케인", "클로페네신", "토코페릴아세테이트", "알란토인", "라우레스-7", "카프릴하이드록사믹애씨드", "오미자추출물", "쇠비름추출물", "병풀추출물", "산수유열매추출물", "감초추출물", "약모밀추출물", "메틸프로판다이올"],
        usage: "1. 아침, 저녁 세안 후 스킨과 에센스 다음 단계에서 사용합니다.\n2. 적당량을 덜어 피부결을 따라 부드럽게 펴 바른 후 가볍게 두드려 흡수시켜 줍니다.\n3. 건조함이 심하거나 특별한 케어가 필요한 부위에는 한 번 더 덧발라 줍니다."
    },
    'eb': {
        description: "보습, 진정, 미백, 탄력 등 다양한 기능성 성분을 효과적으로 전달하며, 가볍고 흡수력이 좋은 에센스 제형",
        type: "에센스",
        ingredients: ["정제수", "부틸렌글라이콜", "시카카이열매추출물", "글리세린", "트레할로오스", "나이아신아마이드", "1,2-헥산다이올", "병풀추출물", "녹차추출물", "마트리카리아추출물", "클레리추출물", "라벤더꽃수", "히아신스전초추출물", "보리지추출물", "검은수레국화추출물", "카보머", "알지닌", "카프릴릴글라이콜", "아데노신", "카프릴하이드록사믹애씨드"],
        usage: "1. 아침, 저녁 세안 후 스킨 다음 단계에서 사용합니다.\n2. 적당량을 덜어 피부결을 따라 부드럽게 펴 바른 후 가볍게 두드려 흡수시켜 줍니다.\n3. 건조함이 심하거나 특별한 케어가 필요한 부위에는 한 번 더 덧발라 줍니다."
    },
    'sb': {
        description: "보습, 진정, 미백, 탄력 등 다양한 기능성 성분을 효과적으로 전달하며, 가볍고 흡수력이 좋은 세럼 제형",
        type: "세럼",
        ingredients: ["정제수", "부틸렌글라이콜", "시카카이열매추출물", "글리세린", "트레할로오스", "나이아신아마이드", "1,2-헥산다이올", "병풀추출물", "녹차추출물", "마트리카리아추출물", "클레리추출물", "라벤더꽃수", "히아신스전초추출물", "보리지추출물", "검은수레국화추출물", "카보머", "알지닌", "카프릴릴글라이콜", "아데노신", "카프릴하이드록사믹애씨드"],
        usage: "1. 아침, 저녁 세안 후 스킨 다음 단계에서 사용합니다.\n2. 적당량을 덜어 피부결을 따라 부드럽게 펴 바른 후 가볍게 두드려 흡수시켜 줍니다.\n3. 건조함이 심하거나 특별한 케어가 필요한 부위에는 한 번 더 덧발라 줍니다."
    },
    'sb30': {
        description: "보습, 진정, 미백, 탄력 등 다양한 기능성 성분을 효과적으로 전달하며, 가볍고 흡수력이 좋은 세럼 제형 (30ml)",
        type: "세럼",
        ingredients: ["정제수", "부틸렌글라이콜", "시카카이열매추출물", "글리세린", "트레할로오스", "나이아신아마이드", "1,2-헥산다이올", "병풀추출물", "녹차추출물", "마트리카리아추출물", "클레리추출물", "라벤더꽃수", "히아신스전초추출물", "보리지추출물", "검은수레국화추출물", "카보머", "알지닌", "카프릴릴글라이콜", "아데노신", "카프릴하이드록사믹애씨드"],
        usage: "1. 아침, 저녁 세안 후 스킨 다음 단계에서 사용합니다.\n2. 적당량을 덜어 피부결을 따라 부드럽게 펴 바른 후 가볍게 두드려 흡수시켜 줍니다.\n3. 건조함이 심하거나 특별한 케어가 필요한 부위에는 한 번 더 덧발라 줍니다."
    },
    'sb50': {
        description: "보습, 진정, 미백, 탄력 등 다양한 기능성 성분을 효과적으로 전달하며, 가볍고 흡수력이 좋은 세럼 제형 (50ml)",
        type: "세럼",
        ingredients: ["정제수", "부틸렌글라이콜", "시카카이열매추출물", "글리세린", "트레할로오스", "나이아신아마이드", "1,2-헥산다이올", "병풀추출물", "녹차추출물", "마트리카리아추출물", "클레리추출물", "라벤더꽃수", "히아신스전초추출물", "보리지추출물", "검은수레국화추출물", "카보머", "알지닌", "카프릴릴글라이콜", "아데노신", "카프릴하이드록사믹애씨드"],
        usage: "1. 아침, 저녁 세안 후 스킨 다음 단계에서 사용합니다.\n2. 적당량을 덜어 피부결을 따라 부드럽게 펴 바른 후 가볍게 두드려 흡수시켜 줍니다.\n3. 건조함이 심하거나 특별한 케어가 필요한 부위에는 한 번 더 덧발라 줍니다."
    },
    '1sb1': {
        description: "지성 피부에 특화된 퍼스트 세럼 베이스로, 피부 유수분 밸런스 조절에 도움",
        type: "퍼스트 세럼",
        ingredients: ["정제수", "버지니아풍년화꽃수", "달팽이점액여과물", "아라비아고무나부검", "시카카이열매추출물", "트레할로오스", "병풀추출물", "스페인감초뿌리추출물", "약모밀추출물", "뽕나무껍질추출물", "부틸렌글라이콜", "프로필렌글라이콜", "베타인", "1,2-헥산다이올", "알란토인", "토코페릴아세테이트", "올리브오일피이지-7에스터", "에칠헥실글리세린"],
        usage: "1. 아침, 저녁 세안 후 토너 다음 단계에서 사용합니다.\n2. 적당량을 분사 후 흡수시켜 줍니다.\n3. 건조함이 심하거나 특별한 케어가 필요한 부위에는 한 번 더 적용해 줍니다.\n4. 화장솜에 적신 후 피부에 올려두어 포인트 팩으로 활용하셔도 좋습니다."
    },
    '1sb2': {
        description: "건성 피부에 특화된 퍼스트 세럼 베이스로, 깊은 보습과 영양 공급에 도움",
        type: "퍼스트 세럼",
        ingredients: ["정제수", "오렌지꽃수", "판테놀", "아라비아고무나무검", "시카카이열매추출물", "트레할로오스", "녹차추출물", "스페인감초뿌리추출물", "약모밀추출물", "뽕나무껍질추출물", "부틸렌글라이콜", "프로필렌글라이콜", "베타인", "1,2-헥산다이올", "알란토인", "토코페릴아세테이트", "올리브오일피이지-7에스터", "에칠핵실글리세린"],
        usage: "1. 아침, 저녁 세안 후 토너 다음 단계에서 사용합니다.\n2. 적당량을 분사 후 흡수시켜 줍니다.\n3. 건조함이 심하거나 특별한 케어가 필요한 부위에는 한 번 더 적용해 줍니다.\n4. 화장솜에 적신 후 피부에 올려두어 포인트 팩으로 활용하셔도 좋습니다."
    },
    '1sb3': {
        description: "미백과 주름 개선 등 이중 기능성을 제공하는 퍼스트 세럼 베이스",
        type: "퍼스트 세럼",
        ingredients: ["정제수", "나이아신아마이드", "아데노신", "판테놀", "아라비아고무나무검", "시카카이열매추출물", "트레할로오스", "병풀추출물", "스페인감초뿌리추출물", "약모밀추출물", "뽕나무껍질추출물", "부틸렌글라이콜", "프로필렌글라이콜", "베타인", "1,2-헥산다이올", "알란토인", "토코페릴아세테이트", "올리브오일피이지-7에스터", "에칠헥실글리세린"],
        usage: "1. 아침, 저녁 세안 후 토너 다음 단계에서 사용합니다.\n2. 적당량을 분사 후 흡수시켜 줍니다.\n3. 건조함이 심하거나 특별한 케어가 필요한 부위에는 한 번 더 적용해 줍니다.\n4. 화장솜에 적신 후 피부에 올려두어 포인트 팩으로 활용하셔도 좋습니다."
    },
    'tb': {
        description: "피부결 정돈 및 다음 단계 제품 흡수를 돕는 토너 제형 베이스로, 피부 진정 및 보습에 중점",
        type: "토너",
        ingredients: ["정제수", "캐모마일꽃수", "부틸렌글라이콜", "알란토인", "병풀추출물", "글리세린", "매실나무추출물", "감나무잎추추물", "약모밀추출물", "올리브오일피이지-7에스터", "1,2-헥산다이올"],
        usage: "1. 아침, 저녁 세안 후 토너 단계에서 사용합니다.\n2. 적당량을 화장솜에 적신 후 부드럽게 닦아 줍니다."
    }
};

// 2. 제이케이레시피 (피부타입별 핵심 추가 성분) - 사용자 제공 최종 데이터
const recipes = {
    'DSPWC': ["아카시아콜라겐", "세라마이드리포좀", "소듐구아이줄렌", "카렌듈라오일", "나이아신아마이드", "알부틴수용액", "아데노신", "캐비어추출물", "SOD", "글루타치온", "향"],
    'DSPWA': ["로즈워터", "트레할로스", "소듐구아이줄렌", "카렌듈라오일", "나이아신아마이드", "비사보롤", "아데노신", "p실크아미노산", "병풀추출물", "APC추출물", "향"],
    'DSPTC': ["아카시아콜라겐", "세라마이드리포좀", "소듐구아이줄렌", "카렌듈라오일", "나이아신아마이드", "알부틴", "트레할로스", "로즈워터", "SOD", "글루타치온", "향"],
    'DSPTA': ["로즈워터", "트레할로스", "아줄렌", "카렌듈라오일", "나이아신아마이드", "비사보롤", "리코라이스추출물", "히아루론산", "병풀추출물", "APC추출물", "향"],
    'DSNWC': ["달팽이추출물", "트레할로스", "아줄렌", "뮤신", "아카시아콜라겐", "코엔자임큐텐", "아데노신", "캐비어추출물", "SOD", "쿠퍼펩타이드", "향"],
    'DSNWA': ["로즈워터", "판테놀", "아줄렌", "뮤신", "SOD", "비사보롤", "아데노신", "실크아미노산", "병풀추출물", "약모밀", "향"],
    'DSNTC': ["달팽이추출물", "트레할로스", "아줄렌", "알란토인", "아카시아콜라겐", "코엔자임큐텐", "캐비어추출물", "로즈워터", "SOD", "쿠퍼펩타이드", "향"],
    'DSNTA': ["로즈워터", "판테놀", "아줄렌", "알란토인", "SOD", "진주추출물", "쿠퍼펩타이드", "실크아미노산", "병풀추출물", "약모밀", "향"],
    'DRPWC': ["판테놀", "모이스춰오일C", "아카시아콜라겐", "캐비어추출물", "나이아신아마이드", "진주추출물", "아데노신", "보르피린", "EGF", "FGF", "향"],
    'DRPWA': ["히아루론산저분자", "세라마이드리포좀", "아카시아콜라겐", "트레할로스", "나이아신아마이드", "티타늄플러스", "아데노신", "이데베논", "병풀추출물", "프로폴리스추출물", "향"],
    'DRPTC': ["판테놀", "모이스춰오일C", "아카시아콜라겐", "트레할로스", "나이아신아마이드", "진주추출물", "갈락토미세스", "실크아미노산", "EGF", "FGF", "향"],
    'DRPTA': ["히아루론산", "세라마이드리포좀", "녹차추출물", "라벤더워터", "나이아신아마이드", "티타늄플러스", "리코라이스", "SOD", "병풀추출물", "프로폴리스추출물", "향"],
    'DRNWC': ["아카시아콜라겐", "달팽이점액추출물", "세라마이드리포좀", "히아루론산", "캐비어", "코엔자임큐텐", "아데노신", "보르피린", "EGF", "KGF", "향"],
    'DRNWA': ["히아루론산", "달팽이점액추출물", "세라마이드", "트레할로스", "라벤더워터", "녹차추출물", "아데노신", "이데베논", "병풀추출물", "리코라이스추출물", "향"],
    'DRNTC': ["아카시아콜라겐", "달팽이점액추출물", "세라마이드리포좀", "판테놀", "갈락토미세스", "비피다", "EGF", "글루타치온", "IGF", "KGF", "향"],
    'DRNTA': ["히아루론산", "달팽이점액추출물", "라벤더워터", "판테놀", "이데베논", "SOD", "녹차추출물", "프로폴리스추출물", "병풀추출물", "리코라이스추출물", "향"],
    'OSPWC': ["위치헤이즐워터", "녹차추출물", "아줄렌", "라벤더워터", "비사보롤", "갈락토미세스", "아데노신", "코엔자임큐텐", "이데베논", "로즈힙오일", "향"],
    'OSPWA': ["병풀추출물", "녹차추출물", "아줄렌", "라벤더워터", "비사보롤", "알부틴", "아데노신", "쿠퍼펩타이드", "APC추출물", "프로폴리스", "향"],
    'OSPTC': ["위치헤이즐워터", "녹차추출물", "아줄렌", "라벤더워터", "비사보롤", "갈락토미세스", "히아루론산", "비피다", "실크아미노산", "로즈힙오일", "향"],
    'OSPTA': ["병풀추출물", "녹차추출물", "아줄렌", "라벤더워터", "비사보롤", "알부틴", "달팽이추출물", "이데베논", "APC추출물", "프로폴리스", "향"],
    'OSNWC': ["위치헤이즐워터", "약모밀추출물", "아줄렌", "알란토인", "FGF", "KGF", "아데노신", "코엔자임큐텐", "실크아미노산", "쿠퍼펩타이드", "향"],
    'OSNWA': ["병풀추출물", "녹차추출물", "아줄렌", "리코라이스추출물", "알란토인", "SOD", "아데노신", "쿠퍼펩타이드", "APC추출물", "TERPL EO", "향"],
    'OSNTC': ["위치헤이즐워터", "약모밀추출물", "아줄렌", "알란토인", "리코라이스추출물", "뮤신", "병풀추출물", "프로폴리스", "실크아미노산", "글루타치온", "향"],
    'OSNTA': ["병풀추출물", "녹차추출물", "아줄렌", "리코라이스추출물", "알란토인", "SOD", "히아루론산", "프로폴리스", "APC추출물", "TERPL EO", "향"],
    'ORPWC': ["위치헤이즐워터", "병풀추출물", "프로폴리스", "비피다", "알부틴", "갈락토미세스", "아데노신", "보르피린", "코엔자임큐텐", "쿠퍼펩타이드", "향"],
    'ORPWA': ["병풀추출물", "위치헤이즐워터", "프로폴리스", "리코라이스", "나이아신아마이드", "비사보롤", "아데노신", "보르피린", "APC추출물", "약모밀", "향"],
    'ORPTC': ["위치헤이즐워터", "병풀추출물", "나이아신아마이드", "로즈워터", "알부틴", "갈락토미세스", "달팽이추출물", "알란토인", "코엔자임큐텐", "비피다", "향"],
    'ORPTA': ["병풀추출물", "위치헤이즐워터", "SOD", "이데베논", "나이아신아마이드", "비사보롤", "달팽이추출물", "로즈워터", "APC추출물", "약모밀", "향"],
    'ORNWC': ["위치헤이즐워터", "프로폴리스", "병풀추출물", "갈락토미세스", "SOD", "녹차추출물", "EGF", "FGF", "코엔자임큐텐", "글루타치온", "향"],
    'ORNWA': ["병풀추출물", "프로폴리스", "녹차추출물", "TERPL EO", "약모밀", "SOD", "IGF", "KGF", "APC추출물", "리코라이스추출물", "향"],
    'ORNTC': ["위치헤이즐워터", "프로폴리스", "병풀추출물", "비피다", "갈락토미세스", "글루타치온", "FGF", "KGF", "코엔자임큐텐", "로즈힙오일", "향"],
    'ORNTA': ["병풀추출물", "프로폴리스", "라벤더워터", "TERPL EO", "트레할로스", "아카시아콜라겐", "알란토인", "쿠퍼펩타이드", "APC추출물", "리코라이스추출물", "향"]
};

// 3. 성분 효능 정보 (카테고리화 및 최신화)
const ingredientEffects = {
    // 향
    'Citrus': '기분좋은 상쾌함이 필요할 때, Citrous가다가옵니다. 레몬과 레몬그라스의 싱그러움,만다린의 달콤함으로 에너지를 주는 향',
    'Green': '맑은공기가필요한순간,Green이당신곁에머뭅니다. 티트리의깨끗함과라벤더의온기가만나마음까지정화하는향.',
    'Floral': '조용한 위로가 필요할때, Floral이 당신을감싸줍니다. 카모마일과 마리골드의 부드러움,자스민의 도도함이 조화로운향.',
    'Sweety': '포근한 달콤함이 그리운날, Sweety를 느껴보세요. 라벤더의 편안함,로즈제라늄의 은은함,오렌지의 상큼함이 조화로운향.',
    '12-헥산다이올': '피부를 촉촉하고 부드럽게 유지하는 보습 효과와 유연하게 하는 효과가 있으며, 항균력을 가진 다른 원료와 조합하여 안정성을 높이는 데 사용됩니다.',
    // 진정/민감
    '소듐구아이줄렌': '캐모마일 꽃에서 아주 소량 추출되며, 피부 수분을 장기간 유지하고 외부 환경으로부터 손상을 방지합니다. 특히 염증, 상처, 재생, 알러지, 트러블, 여드름, 진정, 피부장벽 강화에 도움이 됩니다.',
    '뮤신점증제': '주로 달팽이 점액에서 추출되는 성분으로, 피부 재생을 촉진하고 보호막을 강화하여 부드럽고 탄력 있게 만들어줍니다. 콜라겐과 엘라스틴 생산을 촉진하여 탄력을 높여줍니다.',
    '카렌듈라오일': '피부 염증을 완화하고 진정시켜 트러블을 개선하며, 손상된 피부를 치료하고 재생시킵니다. 상처 치유 및 보습 공급 효과가 있습니다.',
    '유기농라벤더워터': '민감성 및 자극받은 피부를 진정시키고 편안하게 하며, 피부 보호 및 회복 기능으로 건강한 피부 상태를 유지합니다. 지속적인 수분 공급으로 건조를 방지합니다.',
    '알란토인': '피부 수분을 장기간 유지하여 건조를 예방하고, 손상된 피부를 치료하고 재생시켜 피부상을 예방합니다.',
     // 보습/영양
    '판테놀': '프로비타민 B5로, 피부에 지속적으로 수분을 공급하고 장벽을 강화합니다. 피부 손상과 자극을 진정시키고 자연 회복 과정을 촉진합니다.',
    '히아루론산저분자': '저분자 히알루론산으로, 피부 속까지 수분을 공급하여 장시간 보습을 유지하고, 피부 탄력을 개선하여 생기 있는 피부로 가꾸어줍니다.',
    '아카시아콜라겐': '지속적인 수분 공급으로 촉촉하고 윤기 있는 피부를 유지하며, 탄력을 개선하고 주름을 줄여줍니다. 피부 염증과 자극을 완화시킵니다.',
    '모이스춰오일C': '호호바, 스윗아몬드, 아보카도, 로즈힙, 동백오일을 혼합한 오일로, 건성 및 노화 피부에 보습과 영양을 더합니다.',
    '불가리안로즈워터': '피부를 진정시키고 윤기와 수분을 공급합니다. 피부의 pH 밸런스와 보호막을 유지하며, 비타민 E, K가 지친 피부에 생기를 부여합니다.',
    '세라마이드리포좀': '피부 장벽의 핵심 성분인 세라마이드를 리포좀화하여 피부 깊숙이 침투시켜 장벽을 강화하고 보습 효과를 오래 지속시킵니다.',
    '달팽이추출물': '피부 회복력을 향상시키고 재생 과정을 촉진하며, 수분 공급, 자극 완화, 탄력 및 질감 개선에 도움을 줍니다.',
    '트레할로스': '피부의 수분 손실을 방지하고 장시간 보습을 유지하며, 외부 유해 요소로부터 피부를 보호하고 진정시킵니다.',
    // 지성/여드름
    '약모밀추출물': '피부 자극과 염증을 완화하고, 항균 및 항바이러스 특성으로 피부 문제를 예방하며, 수분 공급 및 손상 회복에 기여합니다.',
    '위치헤이즐워터': '민감성, 여드름성 피부에 진정 효과를 제공하고, 모공 수렴, 피부톤 및 질감 개선, 클렌징 효과가 있습니다.',
    'APC추출물': '항염, 항균 효능으로 트러블 및 여드름 피부 개선을 위해 사용됩니다.',
    'AHA': '피부 각질층을 부드럽게 제거하여 매끄러운 피부결을 만들고, 피부톤 개선 및 세포 재생을 촉진합니다.',
    '프로폴리스': '항염, 항균 효과로 피부 상태를 개선하고, 외부 자극으로부터 피부를 보호하며, 재생 기능을 촉진합니다.',
    '병풀추출물': '손상된 피부를 빠르게 회복시키고 자연 재생 능력을 향상시킵니다. 피부 진정, 보습, 탄력 개선에 효과적입니다.',
    '녹차추출물': '강력한 항산화 성분으로 피부 노화를 예방하고, 염증을 완화하며 피부를 진정시키고 수분을 공급합니다.',
    'TERPL EO': '티트리, 유칼립투스, 로즈마리, 페퍼민트, 라벤더 에센셜 오일을 블렌딩하여 지성, 여드름 피부에 시너지 효과를 제공합니다.',
    // 주름/재생
    '보르피린': '피부 지방 세포를 자극하여 볼륨을 제공하고 탄력을 강화하며, 팔자주름 등 라인을 매끄럽게 가꾸는 데 도움을 줍니다.',
    '아데노신': '식약처 고시 주름개선 기능성 성분으로, 피부의 노화 징후를 방지하고 주름 외관을 개선하여 매끄럽고 탄력 있는 피부를 유지합니다.',
    'EGF': '표피세포의 분화와 증식을 도와 피부 재생, 미세주름 완화 및 탄력에 효과적이며, 항염 및 항균 기능에도 기여합니다.',
    'FGF': '섬유아세포를 자극하여 주름 예방, 항노화 기능을 수행하며, 두피 건강 및 건강한 모발 형성에도 도움을 줍니다.',
    '캐비어추출물': '피부에 영양과 수분을 공급하여 탄력과 광채를 개선하고, 상처 치유 및 세포 재생을 촉진합니다.',
    'KGF': '각질형성세포 성장 인자로, 피부 세포 재생을 촉진하고 재생 주기를 활성화시키는 역할을 합니다.',
    'IGF': '인슐린 유사 성장 인자로, 피부 세포의 재생 과정을 촉진하여 건강하고 활기찬 피부를 만드는 데 도움을 줍니다.',
    // 항산화
    'SOD': '강력한 항산화 효소로, 피부를 자유 라디칼로부터 보호하고 산화 스트레스로 인한 손상을 최소화하여 피부 노화의 징후 감소에 도움을 줍니다.',
    '글루타치온': '강력한 항산화 작용과 독소 제거 기능으로 피부 건강을 증진하고, 멜라닌 대사 과정에 작용하여 피부를 맑게 만듭니다.',
    '비피다': '피부 장벽 기능을 강화하고, 손상된 피부 회복을 도우며, 항산화 효과로 노화 징후를 감소시키고 수분 함량을 증가시킵니다.',
    '쿠퍼펩타이드': '피부 세포 성장 및 재생을 촉진하고, 염증을 감소시키며, 혈류를 개선하여 노화 방지에 기여합니다.',
    '이데베논': '강력한 항산화 작용으로 자유라디칼을 중화시켜 피부 손상을 최소화하고, 피부의 자연 방어 체계를 강화하며, 피부 질감을 개선합니다.',
    'p실크아미노산': '지속적인 수분 공급으로 피부를 촉촉하게 유지하고, 부드럽고 매끄러운 피부결을 만들어주며, 외부 환경으로부터 피부를 보호합니다.',
    '코엔자임큐텐': '자유 라디칼로부터 피부를 보호하고, 피부의 자연 회복 능력을 향상시키며, 주름과 미세선을 줄여 젊고 건강한 외모를 유지하는 데 도움을 줍니다.',
    '로즈힙오일': '흉터, 스트레치 마크, 미세 주름의 외관을 개선하고, 일광 손상을 치유하며, 건조한 피부에 수분을 공급하여 균일한 피부톤과 광채를 제공합니다.',
    // 미백
    '비사보롤': '항염증 및 자극 억제 효과가 있으며, 멜라닌 생성을 억제하여 피부 미백에 도움을 줍니다.',
    '티타늄플러스': '티타늄디옥사이드와 징크옥사이드 복합성분으로, UVA 및 UVB로부터 피부를 효과적으로 보호하며, 민감성 피부에도 적합합니다.',
    '진주추출물': '균일하고 밝은 피부톤을 유지하고, 항산화 성분이 노화를 늦추며, 수분과 영양을 공급하여 자극을 완화합니다.',
    // 기타 (이전 목록에서 가져온 정보)
    '히아루론산': "자기 무게의 1000배에 달하는 수분을 끌어당겨 피부 표면에 강력한 보습막을 형성합니다.",
    '세라마이드': "피부 장벽을 구성하는 핵심 지질 성분으로, 외부 자극으로부터 피부를 보호하고 수분 손실을 방지합니다.",
    '라벤더워터': "라벤더 꽃에서 추출한 워터로, 피부를 진정시키고 스트레스를 완화하며 심신에 안정을 줍니다.",
    '아줄렌': "캐모마일에서 추출한 성분으로, 강력한 피부 진정 및 항염 효과를 가집니다.",
    '프로폴리스추출물': "꿀벌이 식물에서 채취한 물질로, 항산화, 항염, 항균 효과가 뛰어나 피부 면역력을 높이고 트러블을 예방합니다.",
    '리코라이스': "감초 뿌리 추출물로, 피부를 진정시키고 붉은기를 완화하며, 멜라닌 생성을 억제하여 미백에도 도움을 줍니다.",
    '달팽이점액추출물': "달팽이 점액 여과물(뮤신)이 주성분으로, 손상된 피부의 재생을 촉진하고 보습과 탄력 개선에 효과적입니다.",
    '약모밀': "어성초라고도 불리며, 피부 진정 및 항염 효과가 뛰어나 트러블성 피부 관리에 도움을 줍니다."
};

const skinTypeDetails = {
    'OSPTA': "지성, 민감성, 색소성, 비주름성 타입으로, 현재 활성 염증(여드름, 붉어짐 등)을 겪고 있는 상태입니다. 스킨케어의 최우선 순위는 항염 및 피지 조절입니다.",
    'OSPTC': "지성, 민감성, 색소성, 비주름성 타입으로, 현재는 염증이 잘 관리되어 깨끗한 상태입니다. 하지만 민감성 경향이 있으므로 자극을 유발하지 않는 예방적 관리가 중요합니다.",
    'OSNTA': "지성, 민감성, 비색소성, 비주름성 타입으로, 현재 활성 염증을 겪고 있는 상태입니다. 피지 과다로 인한 번들거림과 함께 여드름, 붉어짐이 동반됩니다. 현재의 염증을 진정시키는 것이 급선무입니다.",
    'OSNTC': "지성, 민감성, 비색소성, 비주름성 타입으로, 현재는 염증이 관리되어 깨끗한 상태입니다. 유분감은 여전할 수 있으나 트러블은 없습니다. 염증을 유발할 수 있는 자극적인 성분을 피해 현재의 안정적인 상태를 유지하는 것이 중요합니다.",
    'OSPWA': "지성, 민감성, 색소성, 주름성 타입으로, 현재 활성 염증을 겪고 있는 상태입니다. 염증, 색소, 노화라는 세 가지 장벽이 모두 활성화된 가장 까다로운 상태 중 하나입니다. 염증으로 인해 염증 후 색소침착(PIH)이 더욱 악화될 수 있어 즉각적인 항염 관리가 필수적입니다.",
    'OSPWC': "지성, 민감성, 색소성, 주름성 타입으로, 현재는 염증이 관리되어 깨끗한 상태입니다. 염증이 가라앉았으므로 이제 색소 및 주름 관리에 더 집중할 수 있습니다. 새로운 염증을 유발하지 않는 성분을 신중하게 선택해야 합니다.",
    'OSNWA': "지성, 민감성, 비색소성, 주름성 타입으로, 현재 활성 염증을 겪고 있는 상태입니다. 피부 노화 경향과 염증이라는 두 가지 문제를 동시에 안고 있습니다. 레티노이드와 같은 주름 개선 성분은 염증을 악화시킬 수 있으므로, 염증을 먼저 진정시킨 후 저자극 노화 관리를 시작해야 합니다.",
    'OSNWC': "지성, 민감성, 비색소성, 주름성 타입으로, 현재는 염증이 관리되어 깨끗한 상태입니다. 염증이 없으므로 주름 관리에 집중할 수 있는 시기입니다. 피부 장벽을 해치지 않는 범위 내에서 항산화제와 레티노이드 사용을 고려할 수 있습니다.",
    'DSPTA': "건성, 민감성, 색소성, 비주름성 타입으로, 현재 활성 염증을 겪고 있는 상태입니다. 피부 장벽이 손상되어 건조함과 염증이 동시에 나타나며, 이로 인해 색소침착이 더 심해 보일 수 있습니다. 보습을 통한 장벽 강화와 항염 관리가 최우선입니다.",
    'DSPTC': "건성, 민감성, 색소성, 비주름성 타입으로, 현재는 염증이 관리되어 깨끗한 상태입니다. 건조함과 색소 문제가 남아있으므로, 자극 없는 미백 성분과 충분한 보습에 집중해야 합니다.",
    'DSNTA': "건성, 민감성, 비색소성, 비주름성 타입으로, 현재 활성 염증을 겪고 있는 상태입니다. 건조함으로 인해 피부가 가렵고 거칠어지면서 붉어짐이나 트러블이 발생한 상태입니다. 자극적인 각질 제거는 피하고, 순한 클렌저와 장벽 강화 보습제를 사용해야 합니다.",
    'DSNTC': "건성, 민감성, 비색소성, 비주름성 타입으로, 현재는 염증이 관리되어 깨끗한 상태입니다. 주된 고민은 건조함이며, 리놀레산과 오메가-3 지방산이 풍부한 식단과 함께 꾸준한 보습 관리가 필요합니다.",
    'DSPWA': "건성, 민감성, 색소성, 주름성 타입으로, 현재 활성 염증을 겪고 있는 상태입니다. 건조, 염증, 색소, 노화의 네 가지 장벽이 모두 문제를 일으키는 가장 취약한 상태입니다. 모든 문제를 한 번에 해결하려 하기보다, 염증과 건조함을 먼저 완화하는 데 집중해야 합니다.",
    'DSPWC': "건성, 민감성, 색소성, 주름성 타입으로, 현재는 염증이 관리되어 깨끗한 상태입니다. 염증이 안정되었으므로 건조, 색소, 주름 문제에 대한 복합적인 관리를 시작할 수 있습니다. 저자극 성분부터 단계적으로 적용하는 지혜가 필요합니다.",
    'DSNWA': "건성, 민감성, 비색소성, 주름성 타입으로, 현재 활성 염증을 겪고 있는 상태입니다. 건조함과 노화 경향에 염증까지 더해져 피부가 매우 예민하고 불편하게 느껴질 수 있습니다. 항염 성분과 장벽 강화 보습제를 중심으로 관리하고, 주름 개선 성분은 염증이 완전히 가라앉은 후에 고려해야 합니다.",
    'DSNWC': "건성, 민감성, 비색소성, 주름성 타입으로, 현재는 염증이 관리되어 깨끗한 상태입니다. 건조함과 주름 관리에 집중할 수 있으며, 매일 항산화제와 보습제를 사용하고 저녁에는 저강도 레티노이드 사용을 시작해볼 수 있습니다.",
    'ORNTA': "이상적인(ORNT) 타입으로 진단되었으나, 현재 이례적으로 염증이 발생한 상태입니다. 이는 맞지 않는 화장품 사용, 급격한 스트레스, 호르몬 변화 등 특정 유발 요인이 있음을 시사합니다. 일시적으로 민감성(S) 피부에 준하는 항염 관리가 필요합니다.",
    'ORNTC': "이상적인(ORNT) 타입으로, 본래의 건강한 상태를 유지하고 있습니다. 피부 건강을 저해하는 장벽이 없는 상태이므로, 기본적인 자외선 차단과 클렌징만으로도 좋은 피부를 유지할 수 있습니다.",
    'ORPTA': "지성, 저항성, 색소성, 비주름성 타입으로, 현재 이례적으로 염증이 발생한 상태입니다. 모공을 막는 화장품을 사용했거나 스트레스 등으로 인해 일시적으로 트러블이 발생했을 수 있습니다. 원인을 파악하고 일시적으로 항염 관리를 병행해야 합니다.",
    'ORPTC': "지성, 저항성, 색소성, 비주름성 타입으로, 본래의 건강한 상태를 유지하고 있습니다. 염증 우려가 적으므로, 자외선 차단을 통한 색소 관리와 유분 조절에 집중할 수 있습니다.",
    'ORPWA': "지성, 저항성, 색소성, 주름성 타입으로, 현재 이례적으로 염증이 발생한 상태입니다. 피부 타입이 OSPW로 일시적으로 변화한 것으로 볼 수 있습니다. 색소와 주름 관리를 위해 사용하던 고기능성 제품이 자극을 유발했을 가능성을 점검하고, 항염 관리를 우선해야 합니다.",
    'ORPWC': "지성, 저항성, 색소성, 주름성 타입으로, 본래의 건강한 상태를 유지하고 있습니다. 염증에 대한 저항력이 있으므로, 레티노이드나 비타민 C 같은 고농도 활성 성분을 사용하여 색소와 주름을 적극적으로 관리하기에 유리합니다.",
    'ORNWA': "지성, 저항성, 비색소성, 주름성 타입으로, 현재 이례적으로 염증이 발생한 상태입니다. 주름 개선을 위해 사용하던 고강도 레티노이드나 AHA 성분이 피부에 과도한 자극을 주었을 수 있습니다. 제품 사용을 중단하고 피부가 진정될 때까지 기다려야 합니다.",
    'ORNWC': "지성, 저항성, 비색소성, 주름성 타입으로, 본래의 건강한 상태를 유지하고 있습니다. 피부 장벽이 튼튼하여 주름 개선을 위한 강력한 성분들을 효과적으로 사용할 수 있는 최적의 상태입니다.",
    'DRPTA': "건성, 저항성, 색소성, 비주름성 타입으로, 현재 이례적으로 염증이 발생한 상태입니다. 건조함으로 인해 피부 장벽이 약해진 틈을 타 염증이 발생한 경우입니다. 피부 미백 성분 중 일부가 자극을 유발했을 수도 있으므로, 보습과 항염에 집중하여 장벽을 먼저 회복시켜야 합니다.",
    'DRPTC': "건성, 저항성, 색소성, 비주름성 타입으로, 본래의 건강한 상태를 유지하고 있습니다. 염증이 거의 없는 타입이므로, 건조함을 해결하는 보습 관리와 색소 침착을 막는 미백 관리에 집중하시면 됩니다.",
    'DRNTA': "건성, 저항성, 비색소성, 비주름성 타입으로, 현재 이례적으로 염증이 발생한 상태입니다. 과도한 각질 제거, 맞지 않는 클렌저 사용 등으로 건조함이 심해지면서 피부 장벽이 손상되어 염증이 유발된 상태일 수 있습니다. 모든 각질 제거를 중단하고 보습에만 집중해야 합니다.",
    'DRNTC': "건성, 저항성, 비색소성, 비주름성 타입으로, 본래의 건강한 상태를 유지하고 있습니다. 주된 문제는 건조함 하나뿐이며, 거품이 많이 나는 클렌저를 피하고 꾸준한 보습과 자외선 차단만으로도 좋은 피부를 유지할 수 있습니다.",
    'DRPWA': "건성, 저항성, 색소성, 주름성 타입으로, 현재 이례적으로 염증이 발생한 상태입니다. 건조, 색소, 주름 관리를 위해 여러 고기능성 제품을 사용하다가 피부 장벽의 한계치를 넘어 자극 반응이 나타난 경우일 수 있습니다. 스킨케어 단계를 최소화하고 보습과 진정에 집중해야 합니다.",
    'DRPWC': "건성, 저항성, 색소성, 주름성 타입으로, 본래의 건강한 상태를 유지하고 있습니다. 저항성 피부이므로 건조, 색소, 주름이라는 세 가지 문제를 해결하기 위해 AHA, 레티노이드, 항산화제 등 다양한 성분을 활용한 종합적인 관리가 가능합니다.",
    'DRNWA': "건성, 저항성, 비색소성, 주름성 타입으로, 현재 이례적으로 염증이 발생한 상태입니다. 건조함과 주름 관리를 위해 사용한 제품이 자극을 유발했거나, 환경 변화로 인해 피부 장벽이 약해진 상태입니다. 자극적인 제품 사용을 멈추고 피부를 진정시키는 것이 우선입니다.",
    'DRNWC': "건성, 저항성, 비색소성, 주름성 타입으로, 본래의 건강한 상태를 유지하고 있습니다. 피부톤이 균일하고 염증에 강하지만, 건조함과 주름에 취약합니다. 보습과 함께 항산화제, 레티노이드 등을 활용한 꾸준한 항노화 관리가 필요합니다."
};

const skinTypeSummaries = {
    DRPT: "건조, 저항성, 색소성, 팽팽한 피부",
    DRPW: "건조, 저항성, 색소성, 주름진 피부",
    DRNT: "건조, 저항성, 비색소성, 팽팽한 피부",
    DRNW: "건조, 저항성, 비색소성, 주름진 피부",
    DSPT: "건조, 민감성, 색소성, 팽팽한 피부",
    DSPW: "건조, 민감성, 색소성, 주름진 피부",
    DSNT: "건성, 민감성, 비색소성, 비주름성 피부",
    DSNW: "건조, 민감성, 비색소성, 주름진 피부",
    ORPT: "지성, 저항성, 색소성, 팽팽한 피부",
    ORPW: "지성, 저항성, 색소성, 주름진 피부",
    ORNT: "지성, 저항성, 비색소성, 팽팽한 피부",
    ORNW: "지성, 저항성, 비색소성, 주름진 피부",
    OSPT: "지성, 민감성, 색소성, 팽팽한 피부",
    OSPW: "지성, 민감성, 색소성, 주름진 피부",
    OSNT: "지성, 민감성, 비색소성, 팽팽한 피부",
    OSNW: "지성, 민감성, 비색소성, 주름진 피부",
};

const additiveCategories = {
    "미백": ["나이아신아마이드", "비사보롤", "알부틴수용액", "티타늄플러스", "진주추출물", "갈락토미세스"],
    "항산화": ["SOD", "글루타치온", "비피다", "코엔자임큐텐", "로즈힙오일", "쿠퍼펩타이드", "이데베논", "p실크아미노산"],
    "주름": ["보르피린", "아데노신", "EGF", "FGF", "캐비어추출물", "KGF", "IGF"],
    "지성/여드름": ["약모밀추출물", "위치헤이즐워터", "APC추출물", "AHA", "프로폴리스", "병풀추출물", "녹차추출물", "TERPL EO"],
    "보습": ["판테놀", "히아루론산저분자", "아카시아콜라겐", "모이스춰오일C", "불가리안로즈워터", "세라마이드리포좀", "달팽이추출물", "트레할로스"],
    "진정/민감": ["소듐구아이줄렌", "뮤신점증제", "카렌듈라오일", "유기농라벤더워터", "알란토인", "리코라이스추출물"],
    "향": ["Citrus", "Sweety", "Green", "Floral", "1 2-헥산다이올"]
};


// --- UI 컴포넌트 ---
const BaseSelector = ({ options, selected, onSelect, disabled, descriptions }) => (
    <div className="flex flex-wrap gap-2">
        {options.map(option => (
            <button
                key={option}
                onClick={() => onSelect(option)}
                disabled={disabled}
                title={descriptions[option]}
                className={`px-3 py-2 rounded-lg font-semibold transition-all duration-200 text-sm ${
                    selected === option 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-white text-gray-700 hover:bg-blue-100 border border-gray-300'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                {option}
            </button>
        ))}
    </div>
);

const SkinTypePicker = ({ categories, selection, onClick, disabled }) => (
    <div className="space-y-4 p-4 bg-white rounded-lg shadow">
        {categories.map(cat => (
            <div key={cat.id} className="flex items-center justify-between">
                <span className="font-semibold text-gray-600 capitalize w-1/3">{cat.name}</span>
                <div className="flex space-x-2">
                    {cat.options.map(opt => (
                        <button
                            key={opt.code}
                            onClick={() => onClick(cat.id, opt.code)}
                            disabled={disabled}
                            title={opt.desc}
                            className={`w-12 h-12 rounded-full font-bold text-lg transition-all duration-200 flex items-center justify-center ${
                                selection[cat.id] === opt.code
                                ? 'bg-green-500 text-white scale-110 shadow-lg'
                                : 'bg-gray-200 text-gray-600 hover:bg-green-100'
                            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {opt.code}
                        </button>
                    ))}
                </div>
            </div>
        ))}
    </div>
);

const ManualIngredientSelector = ({ selectedIngredients, onSelect, disabled }) => {
    const handleSelect = (ingredientName) => {
        if (selectedIngredients.includes(ingredientName)) {
            onSelect(selectedIngredients.filter(name => name !== ingredientName));
        } else {
            if (selectedIngredients.length < 10) {
                onSelect([...selectedIngredients, ingredientName]);
            } else {
                alert("최대 10개까지만 선택할 수 있습니다.");
            }
        }
    };

    return (
        <div className="space-y-4 max-h-60 overflow-y-auto p-2 border rounded-md">
            <p className="text-sm text-gray-600 mb-2 sticky top-0 bg-gray-50 py-1">원하는 성분을 10개까지 선택하세요. ({selectedIngredients.length}/10)</p>
            {Object.entries(additiveCategories).map(([category, ingredients]) => (
                <div key={category} className="mb-3">
                    <h4 className="font-semibold text-gray-700 mb-2">{category}</h4>
                    <div className="flex flex-wrap gap-2">
                        {ingredients.map(name => {
                            const isSelected = selectedIngredients.includes(name);
                            return (
                                <button
                                    key={name}
                                    onClick={() => handleSelect(name)}
                                    disabled={disabled}
                                    className={`px-2 py-1 text-xs rounded-full transition-all duration-200 ${
                                        isSelected 
                                        ? 'bg-green-500 text-white' 
                                        : 'bg-gray-200 text-gray-700 hover:bg-green-100'
                                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {name}
                                </button>
                            )
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};


const RecipeDetail = ({ info, concept, coreIngredients, usage, fullList }) => (
    <div className="mt-6 p-6 bg-white rounded-lg shadow-lg border border-gray-200">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">레시피 상세 정보</h3>
        
        <div className="mb-6">
            <h4 className="text-lg font-semibold text-blue-600">1. 피부 타입 및 설명</h4>
            <p className="text-gray-600 mt-1"><span className="font-bold">[{info.skinTypeCode}]</span> {info.skinDescription}</p>
        </div>

        <div className="mb-6">
            <h4 className="text-lg font-semibold text-blue-600">2. 제품 컨셉</h4>
            <p className="text-gray-600 mt-1">{concept}</p>
        </div>

        <div className="mb-6">
            <h4 className="text-lg font-semibold text-blue-600">3. 핵심 성분 및 효능</h4>
            <ul className="mt-2 space-y-2 text-gray-700">
                {coreIngredients.map(ing => (
                    <li key={ing.name}>
                        <p><strong className="font-semibold text-gray-800">{ing.name}:</strong></p>
                        <p className="text-sm text-gray-600 pl-2">{ing.effect || '상세 효능 정보가 없습니다.'}</p>
                    </li>
                ))}
            </ul>
        </div>

        <div className="mb-6">
            <h4 className="text-lg font-semibold text-blue-600">4. 사용 방법</h4>
            <p className="text-gray-600 mt-1 whitespace-pre-line">{usage}</p>
        </div>

        <div>
            <h4 className="text-lg font-semibold text-blue-600">5. 전성분</h4>
            <p className="text-gray-500 mt-1 text-sm leading-relaxed bg-gray-50 p-3 rounded-md">
                {fullList.join(', ')}
            </p>
        </div>
    </div>
);

const Precautions = () => (
    <div className="mt-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-xl font-bold text-gray-800 mb-4">6. 사용 시의 주의사항</h3>
        <div className="space-y-4 text-sm text-gray-600">
            <div>
                <h4 className="font-semibold text-gray-700">공통 주의사항</h4>
                <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>화장품 사용 시 또는 사용 후 직사광선에 의하여 사용 부위가 붉은 반점, 부어오름 또는 가려움증 등의 이상 증상이나 부작용이 있는 경우 전문의 등과 상담할 것.</li>
                    <li>상처가 있는 부위 등에는 사용을 자제할 것.</li>
                </ul>
            </div>
            <div>
                <h4 className="font-semibold text-gray-700">보관 및 취급 시의 주의사항</h4>
                <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>가) 어린이의 손이 닿지 않는 곳에 보관할 것.</li>
                    <li>나) 직사광선을 피해서 보관할 것.</li>
                </ul>
            </div>
            <div>
                 <h4 className="font-semibold text-gray-700">맞춤형 화장품 특이사항</h4>
                <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>조제관리사의 상담을 통해 본인에게 맞는 성분을 확인 후 사용할 것.</li>
                    <li>제품 사용 전 반드시 패치 테스트를 진행하여 피부 이상 반응 여부를 확인할 것 (민감성 피부 권장).</li>
                    <li>개별 성분 주의사항: 특정 성분에 알레르기가 있거나 민감한 피부의 경우, 사용 전 반드시 전성분 목록을 확인하시고 소량 테스트 후 사용하시길 권장합니다. 특히 레티놀, 살리실산 등은 임산부나 민감성 피부에 주의가 필요할 수 있습니다.</li>
                </ul>
            </div>
        </div>
    </div>
);

const OfficialProductInfo = ({ productName, productInfo, sellerInfo, manufacturerInfo }) => (
    <div className="mt-6 p-6 bg-white rounded-lg shadow-lg border border-gray-200">
        <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">맞춤형 화장품 정보</h3>
        <div className="space-y-3 text-gray-700">
            <div className="flex justify-between border-b pb-2">
                <span className="font-semibold">제품명</span>
                <span>{productName}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
                <span className="font-semibold">조제일</span>
                <span>{productInfo.prepDate}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
                <span className="font-semibold">조제번호</span>
                <span>{productInfo.prepNumber}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
                <span className="font-semibold">사용기한</span>
                <span>{productInfo.useByDate}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
                <span className="font-semibold">용량</span>
                <span>{productInfo.volume}</span>
            </div>
             <div className="flex justify-between border-b pb-2">
                <span className="font-semibold">가격</span>
                <span>{productInfo.price}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
                <span className="font-semibold">맞춤형화장품판매업자</span>
                <span>{sellerInfo.name}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
                <span className="font-semibold">조제관리사</span>
                <span>{productInfo.managerName}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
                <span className="font-semibold">주소</span>
                <span>{sellerInfo.address}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
                <span className="font-semibold">전화번호</span>
                <span>{sellerInfo.phone}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
                <span className="font-semibold">제조책임판매업자</span>
                <span>{manufacturerInfo.name}</span>
            </div>
            <div className="flex justify-between">
                <span className="font-semibold">주소</span>
                <span>{manufacturerInfo.address}</span>
            </div>
        </div>
    </div>
);

const ConfirmAndSave = ({ canConfirm, canSave, onConfirm, onSave, onReset, saving, savedMsg }) => (
    <div className="mt-8 flex items-center space-x-4">
        {!savedMsg ? (
            <>
                <button
                    onClick={onConfirm}
                    disabled={!canConfirm || canSave}
                    className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200"
                >
                    레시피 확정
                </button>
                <button
                    onClick={onSave}
                    disabled={!canSave || saving}
                    className="px-6 py-3 bg-teal-500 text-white font-bold rounded-lg shadow-md hover:bg-teal-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200"
                >
                    {saving ? '저장 중...' : '정보 저장 및 발송'}
                </button>
            </>
        ) : (
            <>
                <span className="text-green-600 font-semibold">{savedMsg}</span>
                <button
                    onClick={onReset}
                    className="px-6 py-3 bg-gray-500 text-white font-bold rounded-lg shadow-md hover:bg-gray-600 transition-all duration-200"
                >
                    새로 만들기
                </button>
            </>
        )}
    </div>
);


// --- 메인 앱 컴포넌트 ---
function App() {
    // Firebase State
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);

    // 데이터 파싱
    const baseOptions = useMemo(() => Object.keys(baseFullIngredients).sort(), []);
    const baseDescriptions = useMemo(() => 
        Object.entries(baseFullIngredients).reduce((acc, [key, value]) => {
            acc[key] = value.description;
            return acc;
        }, {}), 
    []);
    
    // 상태 관리
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [productName, setProductName] = useState('');
    const [productInfo, setProductInfo] = useState({});
    const [dailyCounter, setDailyCounter] = useState(0);

    const [sellerInfo, setSellerInfo] = useState({
        name: '명에스테틱',
        address: '부산 동래구 안남로 80, 4층',
        phone: '051-582-0102'
    });
    const [manufacturerInfo, setManufacturerInfo] = useState({
        name: '주식회사 제이케이아이앤씨',
        address: '부산광역시남구 신선로 365, 513,517호 산학협력관(용당동, 부경대학교용당캠퍼스)',
    });
    const [managerName, setManagerName] = useState('');
    const [price, setPrice] = useState('');
    const useByDate = '조제일로부터 6개월'; // 고정값으로 변경

    const [selectedBase, setSelectedBase] = useState(baseOptions[0]);
    const [selectedSkinChars, setSelectedSkinChars] = useState({});
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [saveMsg, setSaveMsg] = useState('');

    // 수동 선택 모드 상태
    const [isManualMode, setIsManualMode] = useState(false);
    const [manualIngredients, setManualIngredients] = useState([]);

    // 고객 기록 조회 관련 상태
    const [searchName, setSearchName] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchMessage, setSearchMessage] = useState('');

    const [savedRecordId, setSavedRecordId] = useState(null);

    // Firebase 초기화
    useEffect(() => {
        if (firebaseConfig && Object.keys(firebaseConfig).length > 0) {
            try {
                const app = initializeApp(firebaseConfig);
                const firestoreDb = getFirestore(app);
                const firebaseAuth = getAuth(app);
                setDb(firestoreDb);
                setAuth(firebaseAuth);
                setLogLevel('debug');

                onAuthStateChanged(firebaseAuth, async (user) => {
                    if (user) {
                        setUserId(user.uid);
                    } else {
                        const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
                        try {
                            if (token) {
                                await signInWithCustomToken(firebaseAuth, token);
                            } else {
                                await signInAnonymously(firebaseAuth);
                            }
                        } catch (error) {
                            console.error("Firebase Auth Error:", error);
                        }
                    }
                });
            } catch (e) {
                console.error("Firebase initialization error", e);
            }
        }
    }, []);

    // 제품명 자동 생성을 위한 useEffect
    useEffect(() => {
        const baseType = baseFullIngredients[selectedBase]?.type || '제품';
        const newProductName = customerName ? `${customerName}님 맞춤 ${baseType}` : `맞춤 ${baseType}`;
        setProductName(newProductName);
        setIsConfirmed(false);
        setSaveMsg('');
    }, [customerName, selectedBase]);


    // 피부 특성 카테고리 정의
    const skinCharacteristicCategories = useMemo(() => [
        { id: 'hydration', name: '보습', options: [{ code: 'D', desc: '건성(Dry)' },{ code: 'O', desc: '지성(Oily)'}] },
        { id: 'sensitivity', name: '민감성', options: [{ code: 'S', desc: '민감성(Sensitive)' },{ code: 'R', desc: '저항성(Resistant)'}] },
        { id: 'pigmentation', name: '색소', options: [{ code: 'P', desc: '색소성(Pigmented)' },{ code: 'N', desc: '비색소성(Non-pigmented)'}] },
        { id: 'wrinkle', name: '탄력', options: [{ code: 'W', desc: '주름(Wrinkled)' },{ code: 'T', desc: '탱탱함(Tight)'}] },
        { id: 'inflammation', name: '염증', options: [{ code: 'A', desc: '여드름성(Acne)' },{ code: 'C', desc: '비여드름성(Clear)'}] }
    ], []);
    
    // 레시피 코드 자동 생성
    const selectedRecipeCode = useMemo(() => {
        const order = ['D', 'O', 'S', 'R', 'P', 'N', 'W', 'T', 'A', 'C'];
        const parts = skinCharacteristicCategories.map(cat => selectedSkinChars[cat.id]);
        
        if (parts.length < 5 || parts.some(p => !p)) return null;

        const sortedParts = parts.sort((a, b) => order.indexOf(a) - order.indexOf(b));
        return sortedParts.join('');
    }, [selectedSkinChars, skinCharacteristicCategories]);
    
    // 핵심 성분 목록 생성
    const coreIngredients = useMemo(() => {
        let addedIngredientNames = [];
        if (isManualMode) {
            addedIngredientNames = manualIngredients;
        } else if (selectedRecipeCode && recipes[selectedRecipeCode]) {
            addedIngredientNames = recipes[selectedRecipeCode];
        } else {
            return [];
        }
        
        return addedIngredientNames.map(name => ({
            name,
            effect: ingredientEffects[name] || ''
        }));
    }, [selectedRecipeCode, recipes, isManualMode, manualIngredients]);

    // 전성분 목록 생성
    const fullIngredientList = useMemo(() => {
        if (!selectedBase || !baseFullIngredients[selectedBase]) return [];

        const baseIngs = baseFullIngredients[selectedBase].ingredients;
        const addIngs = coreIngredients.map(ing => ing.name);
        
        const isFragranceAdded = addIngs.some(name => ['Citrus', 'Green', 'Floral', 'Sweety'].includes(name));
        
        const uniqueAddedIngs = addIngs.filter(ing => !baseIngs.includes(ing) && !['Citrus', 'Green', 'Floral', 'Sweety', '향'].includes(ing));
        
        const finalIngredients = [...baseIngs, ...uniqueAddedIngs];
        if (isFragranceAdded) {
            finalIngredients.push('향료');
        }

        return finalIngredients;
    }, [selectedBase, coreIngredients]);

    // 레시피 상세 정보 생성
    const recipeInfo = useMemo(() => {
        if (!selectedRecipeCode) return null;
        const code = selectedRecipeCode; // Use full code for new descriptions
        return {
            skinTypeCode: selectedRecipeCode,
            skinSummary: skinTypeSummaries[code.slice(0,4)] || '고객 맞춤 피부 타입',
            skinDescription: skinTypeDetails[code] || '현재 조합에 대한 상세 설명이 없습니다.'
        };
    }, [selectedRecipeCode, skinTypeDetails]);

    // 제품 컨셉 생성
    const productConcept = useMemo(() => {
        if (!recipeInfo || coreIngredients.length === 0) return productName;
    
        const baseType = baseFullIngredients[selectedBase]?.type || '제품';
        const coreIngredientNames = coreIngredients.map(ing => ing.name).join(', ');
        const code = recipeInfo.skinTypeCode;
    
        const intro = `${customerName}님의 '${recipeInfo.skinSummary}' 타입을 위해 특별히 조제된 맞춤 ${baseType}입니다.`;
        
        let focusSentence = "";
        if (code.includes('A')) {
            focusSentence = "특히 현재의 염증 상태를 진정시키고 민감해진 피부 장벽을 강화하는 것을 최우선 목표로, ";
        } else if (code.includes('S')) {
            focusSentence = "특히 민감해진 피부를 보호하고 장벽을 강화하는 것에 중점을 두어, ";
        } else if (code.includes('D')) {
            focusSentence = "특히 건조한 피부에 깊은 보습을 제공하는 것을 목표로, ";
        } else {
            focusSentence = "고객님의 피부 고민 해결을 목표로, ";
        }
        
        let ingredientsSentence = `엄선된 핵심 성분인 ${coreIngredientNames} 등을 추가하여 완성되었습니다.`;
        if(isManualMode) {
             ingredientsSentence = `조제관리사가 고객님의 피부를 위해 엄선한 핵심 성분인 ${coreIngredientNames} 등을 추가하여 완성되었습니다.`;
        }

        const outro = "이 고유한 레시피는 고객님의 복합적인 피부 고민을 체계적으로 관리하여, 피부 본연의 힘을 길러주고 더욱 건강하고 빛나는 피부로 가꾸는 데 도움을 줄 것입니다.";
    
        return `${intro} ${focusSentence}${ingredientsSentence} ${outro}`;
    }, [customerName, productName, recipeInfo, coreIngredients, selectedBase, isManualMode]);
    
    const handleConfirm = () => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const dateString = `${yyyy}${mm}${dd}`;

        const newCount = dailyCounter + 1;
        setDailyCounter(newCount);
        const countString = String(newCount).padStart(2, '0');

        const prepNumber = `${selectedBase}${dateString}${countString}`;

        const baseVolumes = {
            '1sb1': '100g', '1sb2': '100g', '1sb3': '100g', 'tb': '100g',
            'cb1': '30g', 'cb2': '30g',
            'eb': '30g', 'sb': '30g', 'sb30': '30g',
            'sb50': '50g'
        };
        const volume = baseVolumes[selectedBase] || 'N/A';

        setProductInfo({
            prepDate: `${yyyy}.${mm}.${dd}`,
            prepNumber: prepNumber,
            volume: volume,
            useByDate: useByDate,
            managerName: managerName,
            price: price || "별도 문의"
        });

        setIsConfirmed(true);
    };

    const handleSave = async () => {
        if (!db || !userId) {
            setSaveMsg('오류: 데이터베이스에 연결할 수 없습니다.');
            return;
        }
        
        const record = {
            customerName,
            customerPhone,
            productName,
            selectedBase,
            isManualMode,
            selectedSkinChars,
            manualIngredients: isManualMode ? manualIngredients : [],
            managerName,
            price,
            useByDate,
            productInfo,
            createdAt: Timestamp.now()
        };

        try {
            const docRef = await addDoc(collection(db, `/artifacts/${appId}/users/${userId}/recipes`), record);
            console.log("Document written with ID: ", docRef.id);
            setSavedRecordId(docRef.id);
            setSaveMsg('저장 완료! 고객에게 안내장이 발송되었습니다.');
        } catch (e) {
            console.error("Error adding document: ", e);
            setSaveMsg('저장 실패: 오류가 발생했습니다.');
        }
    };
    
    const handleSearch = async () => {
        if (!db || !userId || !searchName.trim()) {
            setSearchMessage('조회할 고객 이름을 입력해주세요.');
            return;
        }
        setSearchMessage('기록을 조회하는 중...');
        setSearchResults([]);

        try {
            const q = query(
                collection(db, `/artifacts/${appId}/users/${userId}/recipes`), 
                where("customerName", "==", searchName.trim())
            );
            
            const querySnapshot = await getDocs(q);
            const records = [];
            querySnapshot.forEach((doc) => {
                records.push({ id: doc.id, ...doc.data() });
            });

            // Sort by date descending
            records.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

            if (records.length === 0) {
                setSearchMessage('해당 고객의 조제 기록이 없습니다.');
            } else {
                setSearchResults(records);
                setSearchMessage(`${records.length}개의 기록을 찾았습니다.`);
            }
        } catch (e) {
            console.error("Error searching documents: ", e);
            setSearchMessage('조회 실패: 오류가 발생했습니다.');
        }
    };

    const handleLoadRecord = (record) => {
        setCustomerName(record.customerName);
        setCustomerPhone(record.customerPhone || '');
        setManagerName(record.managerName);
        setPrice(record.price);
        setSelectedBase(record.selectedBase);
        setSelectedSkinChars(record.selectedSkinChars);
        setIsManualMode(record.isManualMode);
        setManualIngredients(record.isManualMode ? record.manualIngredients : []);
        
        setSearchName('');
        setSearchResults([]);
        setSearchMessage('');
        setIsConfirmed(false);
        setSaveMsg('');
    };


    const resetAll = () => {
        setCustomerName('');
        setCustomerPhone('');
        setManagerName('');
        setPrice('');
        setSelectedBase(baseOptions[0]);
        setSelectedSkinChars({});
        setIsManualMode(false);
        setManualIngredients([]);
        setIsConfirmed(false);
        setSaveMsg('');
        setProductInfo({});
        setSearchName('');
        setSearchResults([]);
        setSearchMessage('');
        setSavedRecordId(null);
    };

    const resetOnChanges = (setter) => (value) => {
        setter(value);
        setIsConfirmed(false);
        setSaveMsg('');
        setSavedRecordId(null);
    };


    const handleManualModeToggle = () => {
        const newMode = !isManualMode;
        setIsManualMode(newMode);
        if (newMode) {
            setManualIngredients([]); // Start with a blank slate
        }
        setIsConfirmed(false);
        setSaveMsg('');
    };
    
    const qrCodeText = useMemo(() => {
        if (!isConfirmed || !savedRecordId) return null;
        
        // This URL is a placeholder. In a real application, you would have a page
        // that takes the record ID and displays the full details.
        return `https://your-app.com/recipe/${savedRecordId}`;

    }, [isConfirmed, savedRecordId]);


    return (
        <div className="bg-gray-50 min-h-screen p-4 sm:p-8 font-sans">
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-2xl p-6 sm:p-8">
                
                <header className="border-b pb-4 mb-6">
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">맞춤형 화장품 레시피</h1>
                    <p className="text-gray-500 mt-2">고객의 피부 타입에 맞는 최적의 레시피를 생성하고 안내장을 만듭니다.</p>
                </header>

                <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* 왼쪽: 입력 영역 */}
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-700 mb-3">필수 정보 입력</h2>
                            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                                <label className="block">
                                    <span className="text-gray-600 font-semibold">고객 이름</span>
                                    <input 
                                      type="text"
                                      value={customerName} 
                                      onChange={e => setCustomerName(e.target.value)}
                                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                      placeholder="예: 홍길동"
                                    />
                                </label>
                                <label className="block">
                                    <span className="text-gray-600 font-semibold">전화번호</span>
                                    <input 
                                      type="tel"
                                      value={customerPhone} 
                                      onChange={e => setCustomerPhone(e.target.value)}
                                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                      placeholder="예: 010-1234-5678"
                                    />
                                </label>
                                 <label className="block">
                                    <span className="text-gray-600 font-semibold">조제관리사 성명</span>
                                    <input 
                                      type="text"
                                      value={managerName} 
                                      onChange={e => setManagerName(e.target.value)}
                                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                      placeholder="예: 김조제"
                                    />
                                </label>
                                 <label className="block">
                                    <span className="text-gray-600 font-semibold">가격 (선택)</span>
                                    <input 
                                      type="text"
                                      value={price} 
                                      onChange={e => setPrice(e.target.value)}
                                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                      placeholder="예: 50,000원"
                                    />
                                </label>
                            </div>
                        </div>
                        
                        <div>
                            <h2 className="text-xl font-bold text-gray-700 mb-3">베이스 선택</h2>
                            <BaseSelector
                                options={baseOptions}
                                selected={selectedBase}
                                onSelect={resetOnChanges(setSelectedBase)}
                                disabled={isConfirmed}
                                descriptions={baseDescriptions}
                            />
                        </div>

                        <div>
                            <h2 className="text-xl font-bold text-gray-700 mb-3">피부 타입 선택</h2>
                            <SkinTypePicker
                                categories={skinCharacteristicCategories}
                                selection={selectedSkinChars}
                                onClick={(cat, code) => {
                                    resetOnChanges(setSelectedSkinChars)(s => ({...s, [cat]: code}));
                                }}
                                disabled={isConfirmed}
                            />
                        </div>

                        <div>
                             <h2 className="text-xl font-bold text-gray-700 mb-3">추가 성분 선택 (선택 사항)</h2>
                             <div className="p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center mb-4">
                                    <input
                                        id="manual-mode-checkbox"
                                        type="checkbox"
                                        checked={isManualMode}
                                        onChange={handleManualModeToggle}
                                        disabled={!selectedRecipeCode}
                                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                                    />
                                    <label htmlFor="manual-mode-checkbox" className={`ml-2 block text-sm font-medium ${!selectedRecipeCode ? 'text-gray-400' : 'text-gray-900'}`}>
                                        추가 성분 직접 선택
                                    </label>
                                </div>
                                {isManualMode && selectedRecipeCode && (
                                    <ManualIngredientSelector 
                                        selectedIngredients={manualIngredients}
                                        onSelect={setManualIngredients}
                                        disabled={isConfirmed}
                                    />
                                )}
                            </div>
                        </div>

                        {/* 고객 기록 조회 섹션 */}
                        <div>
                            <h2 className="text-xl font-bold text-gray-700 mb-3">고객 기록 조회</h2>
                            <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                                <label className="block">
                                    <span className="text-gray-600 font-semibold">조회할 고객 이름</span>
                                    <input 
                                      type="text"
                                      value={searchName} 
                                      onChange={e => setSearchName(e.target.value)}
                                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                                      placeholder="조회할 고객 이름을 입력하세요"
                                    />
                                </label>
                                <button onClick={handleSearch} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                                    조회
                                </button>
                                {searchMessage && <p className="text-sm text-gray-600 mt-2">{searchMessage}</p>}
                                {searchResults.length > 0 && (
                                    <ul className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                                        {searchResults.map(record => (
                                            <li key={record.id} className="p-2 border rounded-md flex justify-between items-center">
                                                <div>
                                                    <p className="font-semibold">{record.productName}</p>
                                                    <p className="text-xs text-gray-500">{record.productInfo.prepDate}</p>
                                                </div>
                                                <button onClick={() => handleLoadRecord(record)} className="px-3 py-1 bg-green-500 text-white text-xs rounded-md hover:bg-green-600">
                                                    불러오기
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 오른쪽: 결과 표시 영역 */}
                    <div>
                        <h2 className="text-xl font-bold text-gray-700 mb-3">{customerName ? `${customerName}님을 위한 맞춤형 화장품 안내장` : '생성된 안내장'}</h2>
                        <div className="p-4 bg-gray-100 rounded-lg">
                            <h3 className="font-semibold text-gray-800">선택된 레시피 코드: 
                                <span className={`ml-2 px-3 py-1 rounded-full text-lg font-mono ${selectedRecipeCode ? 'bg-blue-200 text-blue-800' : 'bg-red-200 text-red-800'}`}>
                                    {selectedRecipeCode || '미완성'}
                                </span>
                            </h3>
                        </div>

                        {isConfirmed && recipeInfo && coreIngredients.length > 0 && (
                           <>
                                <div className="mt-4 space-y-4">
                                    {savedRecordId && <QRCode text={qrCodeText} />}
                                    <RecipeDetail
                                        info={recipeInfo}
                                        concept={productConcept}
                                        coreIngredients={coreIngredients}
                                        usage={baseFullIngredients[selectedBase]?.usage || "제품 유형에 맞는 사용법을 따르세요."}
                                        fullList={fullIngredientList}
                                    />
                                    <Precautions />
                                    <OfficialProductInfo 
                                        productName={productName}
                                        productInfo={productInfo}
                                        sellerInfo={sellerInfo}
                                        manufacturerInfo={manufacturerInfo}
                                    />
                                </div>
                           </>
                        )}
                    </div>
                </section>

                <footer className="mt-8 border-t pt-6">
                    <ConfirmAndSave
                        canConfirm={!!(customerName && managerName && ( (selectedRecipeCode && selectedRecipeCode !== 'MANUAL' && recipes[selectedRecipeCode]) || (isManualMode && manualIngredients.length > 0) ) )}
                        canSave={isConfirmed}
                        onConfirm={handleConfirm}
                        onSave={handleSave}
                        onReset={resetAll}
                        saving={false} // You can manage a loading state here
                        savedMsg={saveMsg}
                    />
                </footer>
            </div>
        </div>
    );
}

export default App;
