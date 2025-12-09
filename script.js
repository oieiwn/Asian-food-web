/**********************
 * BASIC CHECK
 **********************/
console.log("script.js loaded");

/**********************
 * TEACHABLE MACHINE MODEL
 **********************/
const MODEL_URL = "https://teachablemachine.withgoogle.com/models/SCrCm4nRI/";
//아두이노 상태 변수들
let arduinoPort = null;
let arduinoWriter = null;
let isArduinoConnected = false;
let lastCalories = null;


// HTML Elements – Food Classifier
const fileInput = document.getElementById("image-input");
const previewImage = document.getElementById("preview-image");
const statusEl = document.getElementById("status");
const resultCountry = document.getElementById("result-country");
const resultList = document.getElementById("result-list");
const recommendationBox = document.getElementById("recommendation-box");
const foodRestaurantBtn = document.getElementById("food-restaurant-btn");

// HTML Elements – Travel (맛집 모드)
const travelCountry = document.getElementById("travel-country");
const travelLocation = document.getElementById("travel-location");
const travelSearchBtn = document.getElementById("travel-search-btn");
const mapLinks = document.getElementById("map-links");
const areaTagsContainer = document.querySelector(".area-tags");

// 나라별 대표 도시 2개씩 추천
const areaSuggestions = {
  Korea: ["Myeongdong, Seoul", "Seongsu, Seoul"],
  Japan: ["Shibuya, Tokyo", "Akihabara, Tokyo"],
  China: ["Wangfujing, Beijing", "The Bund, Shanghai"],
  Thailand: ["Siam, Bangkok", "Old Town, Chiang Mai"]
};

function renderAreaTags(country) {
  const cities = areaSuggestions[country] || [];
  areaTagsContainer.innerHTML = cities
    .map(
      (city) =>
        `<button type="button" class="area-tag">${city}</button>`
    )
    .join("");

  const tags = areaTagsContainer.querySelectorAll(".area-tag");
  tags.forEach((tag) => {
    tag.addEventListener("click", () => {
      travelLocation.value = tag.textContent;
      travelLocation.focus();
    });
  });
}

// 처음 로드될 때 현재 선택된 나라 기준으로 태그 보여주기
renderAreaTags(travelCountry.value);
travelCountry.addEventListener("change", () => {
  renderAreaTags(travelCountry.value);
});

/**********************
 * TRAVEL MENU (관광 코스 화면 전환)
 **********************/
const mainMenu = document.getElementById("travel-main-menu");
const touristMode = document.getElementById("tourist-mode");
const restaurantMode = document.getElementById("restaurant-mode");

const btnTourist = document.getElementById("btn-tourist-mode");
const btnFood = document.getElementById("btn-food-mode");

const container = document.querySelector(".container");
const homeMenu = document.querySelector(".home-menu");

// 메인 카드에서 상세 화면으로 들어갈 때 공통으로 호출
function openDetail() {
  document.body.classList.add("show-detail");
  container.classList.remove("hidden-at-start"); // 아래 내용 보이게
  homeMenu.style.display = "none";               // 위 3카드 숨기기
}

// ===== 상단 3개 카드 → 아래 기능 대신 실행 =====
const cardFindRest = document.getElementById("card-find-rest");
const cardFoodMain = document.getElementById("card-food-main");
const cardCourseMain = document.getElementById("card-course-main");

// 각 섹션 (부드러운 스크롤용)
const classifierSection = document.getElementById("classifier-section");
const travelSection = document.getElementById("travel-section");

// 1) 가운데 카드: Asian Food Classifier → 업로드 버튼 기능
cardFoodMain.addEventListener("click", (e) => {
  e.preventDefault();
classifierSection.style.display = "none";   // UI 숨기기


  openDetail(); // 메인 카드 숨기고 아래 화면 켜기
  document.body.classList.add("view-food-only");
  document.body.classList.remove("view-travel-only");

  if (classifierSection) {
    classifierSection.scrollIntoView({ behavior: "smooth" });
  }
  if (fileInput) {
    fileInput.click();
  }
});



// 2) 오른쪽 카드: Make 1-day Course → 관광 모드
cardCourseMain.addEventListener("click", (e) => {
  e.preventDefault();

  openDetail();
  document.body.classList.add("view-travel-only");
  document.body.classList.remove("view-food-only");

  if (travelSection) {
    travelSection.scrollIntoView({ behavior: "smooth" });
  }
  if (btnTourist) {
    btnTourist.click();
  }
});

// 3) 왼쪽 카드: Find Asian Restaurants → 맛집 모드
cardFindRest.addEventListener("click", (e) => {
  e.preventDefault();

  openDetail();
  document.body.classList.add("view-travel-only");
  document.body.classList.remove("view-food-only");

  if (travelSection) {
    travelSection.scrollIntoView({ behavior: "smooth" });
  }
  if (btnFood) {
    btnFood.click();
  }
});



// Tourist mode elements
const touristList = document.getElementById("tourist-list");
const touristMap = document.getElementById("tourist-map");
const tourAreaInput = document.getElementById("tour-area-input");
const tourCourseBtn = document.getElementById("tour-course-btn");
const tourStyleButtons = document.querySelectorAll(".tour-style-btn");
const tourAreaTags = document.querySelectorAll(".tour-area-tag");

// 코스용 지역 예시 태그 (4나라 × 2개)
tourAreaTags.forEach(tag => {
  tag.addEventListener("click", () => {
    tourAreaInput.value = tag.textContent;
    tourAreaInput.focus();
  });
});

/**********************
 * TOURIST COURSE DATABASE
 * (태그로 보여주는 8개 지역)
 **********************/
const courseDB = {
  // ===== 한국 =====
  "Seongsu, Seoul": {
    foodculture: [
      {
        time: "11:30",
        name: "Cafe Onion Seongsu",
        desc: "Brunch at Seoul’s most iconic industrial-style cafe.",
        mapsQuery: "Cafe Onion Seongsu"
      },
      {
        time: "13:30",
        name: "Seongsu Handmade Shoe Street",
        desc: "Explore local crafts, indie brands, and cultural artisan shops.",
        mapsQuery: "성수 수제화 거리"
      },
      {
        time: "15:30",
        name: "Seoul Forest",
        desc: "Experience local culture through art installations and park life.",
        mapsQuery: "서울숲"
      },
      {
        time: "18:00",
        name: "Seongsu Korean BBQ Street",
        desc: "Taste authentic Korean BBQ, a key part of modern Korean food culture.",
        mapsQuery: "성수 고기 맛집"
      }
    ],
    shopping: [
      {
        time: "13:00",
        name: "Seongsu Select Shops",
        desc: "Explore trendy fashion and lifestyle stores.",
        mapsQuery: "성수 편집샵"
      },
      {
        time: "16:00",
        name: "Common Ground",
        desc: "Container pop-up mall & photo spots.",
        mapsQuery: "커먼그라운드"
      },
      {
        time: "18:30",
        name: "Local Restaurant Street",
        desc: "End the day with dinner at a famous restaurant street.",
        mapsQuery: "성수 맛집 거리"
      }
    ],
    night: [
      {
        time: "18:00",
        name: "Cafe with Sunset View",
        desc: "Relax with coffee before night falls.",
        mapsQuery: "성수 카페 뷰 좋은 곳"
      },
      {
        time: "19:30",
        name: "Seongsu Bridge Night View",
        desc: "Walk along the bridge and enjoy night scenery.",
        mapsQuery: "성수대교 전망"
      },
      {
        time: "21:00",
        name: "Riverside Walk",
        desc: "Slow walk along the Han river.",
        mapsQuery: "뚝섬 한강공원"
      }
    ]
  },

  "Myeongdong, Seoul": {
    foodculture: [
      {
        time: "11:30",
        name: "Myeongdong Kalguksu Street",
        desc: "Try Korean noodle soup, a daily staple in Korean cuisine.",
        mapsQuery: "명동 칼국수 맛집"
      },
      {
        time: "13:30",
        name: "Myeongdong Cathedral",
        desc: "Explore a key cultural landmark with historical significance.",
        mapsQuery: "Myeongdong Cathedral"
      },
      {
        time: "15:00",
        name: "Myeongdong Cafe Street",
        desc: "Enjoy dessert while experiencing Korea’s cafe culture.",
        mapsQuery: "명동 카페 거리"
      },
      {
        time: "18:00",
        name: "Myeongdong Street Food Alley",
        desc: "Taste famous Korean street foods such as tteokbokki & hotteok.",
        mapsQuery: "명동 길거리 음식"
      }
    ],
    shopping: [
      {
        time: "13:00",
        name: "Myeongdong Shopping Street",
        desc: "Cosmetics, fashion, and souvenir street.",
        mapsQuery: "Myeongdong Shopping Street"
      },
      {
        time: "15:30",
        name: "Lotte Department Store (Myeongdong)",
        desc: "Department store and duty free.",
        mapsQuery: "Lotte Department Store Myeongdong"
      },
      {
        time: "18:00",
        name: "Street Food Alley",
        desc: "Try Korean street snacks for dinner.",
        mapsQuery: "명동 길거리 음식"
      }
    ],
    night: [
      {
        time: "18:00",
        name: "Myeongdong Street Lights",
        desc: "Enjoy night lights and buskers.",
        mapsQuery: "Myeongdong night"
      },
      {
        time: "19:30",
        name: "N Seoul Tower",
        desc: "Night view of Seoul from the tower.",
        mapsQuery: "N Seoul Tower"
      },
      {
        time: "21:00",
        name: "View from Namsan",
        desc: "Slow walk and photos at the observatory.",
        mapsQuery: "Namsan Observatory"
      }
    ]
  },

  // ===== 일본 =====
  "Shibuya, Tokyo": {
    foodculture: [
      {
        time: "11:30",
        name: "Shibuya Sushi Restaurant",
        desc: "Experience authentic Japanese sushi culture in Tokyo.",
        mapsQuery: "Shibuya sushi"
      },
      {
        time: "13:30",
        name: "Hachiko Statue & Scramble Crossing",
        desc: "A cultural symbol of loyalty + the world’s busiest crossing.",
        mapsQuery: "Hachiko Statue"
      },
      {
        time: "15:00",
        name: "Meiji Shrine Entrance Walk",
        desc: "Experience traditions, nature, and Japanese spirituality.",
        mapsQuery: "Meiji Shrine"
      },
      {
        time: "18:00",
        name: "Izakaya Street",
        desc: "Enjoy Japanese food culture through shared plates at an izakaya.",
        mapsQuery: "Shibuya Izakaya"
      }
    ],
    shopping: [
      {
        time: "13:00",
        name: "Shibuya 109",
        desc: "Iconic fashion shopping mall.",
        mapsQuery: "Shibuya 109"
      },
      {
        time: "15:30",
        name: "Center Gai Street",
        desc: "Street full of shops and food.",
        mapsQuery: "Shibuya Center Gai"
      },
      {
        time: "18:00",
        name: "PARCO Shibuya",
        desc: "Modern shopping complex with anime & art.",
        mapsQuery: "Shibuya PARCO"
      }
    ],
    night: [
      {
        time: "18:00",
        name: "Shibuya Crossing Night View",
        desc: "See the lights and crowds at night.",
        mapsQuery: "Shibuya Crossing night"
      },
      {
        time: "19:30",
        name: "Izakaya Street",
        desc: "Experience Japanese bar food and drinks.",
        mapsQuery: "Shibuya Izakaya"
      },
      {
        time: "21:00",
        name: "Shibuya Night Walk",
        desc: "Walk around side streets and neon signs.",
        mapsQuery: "Shibuya nightlife"
      }
    ]
  },

  "Akihabara, Tokyo": {
    foodculture: [
      {
        time: "11:30",
        name: "Akihabara Ramen Shop",
        desc: "Try classic Japanese ramen, a major cultural dish.",
        mapsQuery: "Akihabara ramen"
      },
      {
        time: "13:30",
        name: "Kanda River Walk",
        desc: "A calm cultural walk near the river.",
        mapsQuery: "Kanda River Akihabara"
      },
      {
        time: "15:00",
        name: "Anime & Figure Shops",
        desc: "Explore otaku culture and Japanese pop influence.",
        mapsQuery: "Akihabara anime shop"
      },
      {
        time: "18:00",
        name: "Retro Game Center",
        desc: "Experience Japan’s iconic arcade culture.",
        mapsQuery: "Akihabara game center"
      }
    ],
    shopping: [
      {
        time: "13:00",
        name: "Akihabara Electric Town",
        desc: "Explore electronics and games.",
        mapsQuery: "Akihabara Electric Town"
      },
      {
        time: "15:30",
        name: "Anime & Figure Shops",
        desc: "Character goods and anime items.",
        mapsQuery: "Akihabara anime shop"
      },
      {
        time: "18:00",
        name: "Retro Game Stores",
        desc: "Old consoles and games hunting.",
        mapsQuery: "Akihabara retro game shop"
      }
    ],
    night: [
      {
        time: "18:00",
        name: "Akihabara Neon Streets",
        desc: "Take photos of neon signs at night.",
        mapsQuery: "Akihabara night"
      },
      {
        time: "19:30",
        name: "Game Center & Arcade",
        desc: "Enjoy arcade games with friends.",
        mapsQuery: "Akihabara game center"
      },
      {
        time: "21:00",
        name: "Late-night Ramen",
        desc: "Finish the day with a ramen shop.",
        mapsQuery: "Akihabara ramen"
      }
    ]
  },

  // ===== 중국 =====
  "The Bund, Shanghai": {
    foodculture: [
      {
        time: "11:30",
        name: "Traditional Shanghai Dim Sum",
        desc: "Start with authentic dim sum — a key part of Chinese dining culture.",
        mapsQuery: "Shanghai dim sum"
      },
      {
        time: "13:30",
        name: "Bund Riverside Walk",
        desc: "Experience Shanghai’s historical global influence.",
        mapsQuery: "The Bund Shanghai"
      },
      {
        time: "15:00",
        name: "Historic Buildings Tour",
        desc: "Explore old European-style buildings and Chinese heritage.",
        mapsQuery: "Bund historic buildings"
      },
      {
        time: "18:00",
        name: "Local Shanghai Cuisine",
        desc: "Taste dishes like braised pork or soup dumplings.",
        mapsQuery: "Shanghai local food"
      }
    ],
    shopping: [
      {
        time: "13:00",
        name: "Nanjing Road Pedestrian Street",
        desc: "One of the most famous shopping streets.",
        mapsQuery: "Nanjing Road Pedestrian Street"
      },
      {
        time: "15:30",
        name: "IFC Mall",
        desc: "Modern shopping mall near the Bund.",
        mapsQuery: "Shanghai IFC Mall"
      },
      {
        time: "18:00",
        name: "Souvenir Shops",
        desc: "Look for Shanghai-style gifts.",
        mapsQuery: "Nanjing Road souvenir shop"
      }
    ],
    night: [
      {
        time: "18:00",
        name: "Bund Night View",
        desc: "See the famous skyline with lights.",
        mapsQuery: "The Bund night view"
      },
      {
        time: "19:30",
        name: "Huangpu River Cruise",
        desc: "Enjoy the night scenery from a boat.",
        mapsQuery: "Huangpu River night cruise"
      },
      {
        time: "21:00",
        name: "Rooftop Bar",
        desc: "Relax with a drink and view.",
        mapsQuery: "Bund rooftop bar"
      }
    ]
  },

  "Wangfujing, Beijing": {
    foodculture: [
      {
        time: "11:30",
        name: "Beijing Local Noodles",
        desc: "Try zhajiangmian, a cultural Beijing staple.",
        mapsQuery: "Wangfujing noodles"
      },
      {
        time: "13:00",
        name: "Nearby Hutong Walk",
        desc: "Explore traditional Beijing alley culture.",
        mapsQuery: "Beijing Hutong"
      },
      {
        time: "15:00",
        name: "Bookstore & Tea Shop",
        desc: "Relax with traditional Chinese tea.",
        mapsQuery: "Wangfujing tea"
      },
      {
        time: "18:00",
        name: "Beijing Snack Street",
        desc: "Cultural food experience with unique Beijing snacks.",
        mapsQuery: "Wangfujing Snack Street"
      }
    ],
    shopping: [
      {
        time: "13:00",
        name: "Wangfujing Shopping Street",
        desc: "Department stores and local shops.",
        mapsQuery: "Wangfujing Shopping Street"
      },
      {
        time: "15:30",
        name: "Beijing Department Store",
        desc: "Classic department store of Beijing.",
        mapsQuery: "Beijing Department Store Wangfujing"
      },
      {
        time: "18:00",
        name: "Snack Street",
        desc: "Try Beijing street food and snacks.",
        mapsQuery: "Wangfujing Snack Street"
      }
    ],
    night: [
      {
        time: "18:00",
        name: "Night Market",
        desc: "Explore local snacks and lights.",
        mapsQuery: "Wangfujing night market"
      },
      {
        time: "19:30",
        name: "Night Walk on Shopping Street",
        desc: "See neon signs and crowds.",
        mapsQuery: "Wangfujing night"
      },
      {
        time: "21:00",
        name: "Late Dessert Cafe",
        desc: "Finish with dessert or tea.",
        mapsQuery: "Wangfujing dessert cafe"
      }
    ]
  },

  // ===== 태국 =====
  "Siam, Bangkok": {
    foodculture: [
      {
        time: "11:30",
        name: "Pad Thai Local Restaurant",
        desc: "Taste Thailand’s iconic noodle dish.",
        mapsQuery: "Siam Pad Thai"
      },
      {
        time: "13:00",
        name: "Lumpini Park",
        desc: "Experience local Thai daily life in the city’s green space.",
        mapsQuery: "Lumpini Park"
      },
      {
        time: "15:00",
        name: "Thai Cultural House or Museum",
        desc: "Explore Thai art, temples, and cultural displays.",
        mapsQuery: "Bangkok culture museum"
      },
      {
        time: "18:00",
        name: "Street Food in Siam",
        desc: "Enjoy Thai food culture through night street food.",
        mapsQuery: "Bangkok street food Siam"
      }
    ],
    shopping: [
      {
        time: "13:00",
        name: "Siam Paragon",
        desc: "Luxury mall with many brands.",
        mapsQuery: "Siam Paragon"
      },
      {
        time: "15:30",
        name: "Siam Center & Siam Discovery",
        desc: "Trendy fashion and lifestyle shops.",
        mapsQuery: "Siam Center"
      },
      {
        time: "18:00",
        name: "MBK Center",
        desc: "Local-style shopping mall with good prices.",
        mapsQuery: "MBK Center"
      }
    ],
    night: [
      {
        time: "18:00",
        name: "Siam Night Lights",
        desc: "Enjoy the lights around the malls.",
        mapsQuery: "Siam Bangkok night"
      },
      {
        time: "19:30",
        name: "Rooftop Bar near Siam",
        desc: "City view with a drink.",
        mapsQuery: "Bangkok rooftop bar near Siam"
      },
      {
        time: "21:00",
        name: "Night Street Food",
        desc: "End with street food near Siam.",
        mapsQuery: "Bangkok street food Siam"
      }
    ]
  },

  "Old Town, Chiang Mai": {
    foodculture: [
      {
        time: "11:30",
        name: "Local Thai Curry Restaurant",
        desc: "Experience northern Thai curry dishes.",
        mapsQuery: "Chiang Mai curry restaurant"
      },
      {
        time: "13:00",
        name: "Wat Phra Singh Temple",
        desc: "Explore Chiang Mai’s Buddhist culture.",
        mapsQuery: "Wat Phra Singh"
      },
      {
        time: "15:00",
        name: "Old Town Walk",
        desc: "See city walls, moat, and historical architecture.",
        mapsQuery: "Chiang Mai old city wall"
      },
      {
        time: "18:00",
        name: "Night Market & Local Food",
        desc: "Try traditional Thai snacks and local crafts.",
        mapsQuery: "Chiang Mai night market"
      }
    ],
    shopping: [
      {
        time: "13:00",
        name: "Local Craft Shops",
        desc: "Look for handmade goods and souvenirs.",
        mapsQuery: "Chiang Mai Old Town craft shop"
      },
      {
        time: "15:30",
        name: "Warorot Market",
        desc: "Traditional market with local products.",
        mapsQuery: "Warorot Market"
      },
      {
        time: "18:00",
        name: "Sunday Walking Street (if weekend)",
        desc: "Street market with food and crafts.",
        mapsQuery: "Chiang Mai Sunday Walking Street"
      }
    ],
    night: [
      {
        time: "18:00",
        name: "Night Market in Old Town",
        desc: "Explore small night markets around the old city.",
        mapsQuery: "Chiang Mai Old Town night market"
      },
      {
        time: "19:30",
        name: "Riverside Dinner",
        desc: "Have dinner at a riverside restaurant.",
        mapsQuery: "Chiang Mai riverside restaurant"
      },
      {
        time: "21:00",
        name: "Chill Bar or Cafe",
        desc: "Finish with a relaxed drink or dessert.",
        mapsQuery: "Chiang Mai Old Town bar"
      }
    ]
  }
};

let selectedStyle = "foodculture";   // 원래 chill 이던 부분


tourStyleButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    tourStyleButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedStyle = btn.dataset.style;
  });
});

function renderCourse(area, style) {
  const areaData = courseDB[area];
  if (!areaData) {
    touristList.innerHTML = `
      <h3>No course data for "${area}"</h3>
      <p>Try "Seongsu, Seoul" or "Shibuya, Tokyo".</p>
    `;
    touristMap.src = "";
    return;
  }

  const course = areaData[style];
  if (!course) {
    touristList.innerHTML = `
      <h3>No "${style}" style course for "${area}"</h3>
    `;
    touristMap.src = "";
    return;
  }

const styleName =
  style === "foodculture" ? "Local Food & Culture" :
  style === "shopping"   ? "Street Market & Shopping" :
                            "Night View & Drinks";


  let html = `
    <h3>${area} — ${styleName} Course</h3>
    <ol class="course-list">
  `;

  course.forEach(stop => {
    html += `
      <li>
        <div class="course-time">${stop.time}</div>
        <div class="course-body">
          <div class="course-name">${stop.name}</div>
          <div class="course-desc">${stop.desc}</div>
          <button type="button" class="course-map-btn" data-query="${stop.mapsQuery}">
            📍 Open on Google Maps
          </button>
        </div>
      </li>
    `;
  });

  html += `</ol>`;
  touristList.innerHTML = html;

  touristMap.src =
    `https://www.google.com/maps?q=${encodeURIComponent(area)}&output=embed`;

  const mapButtons = touristList.querySelectorAll(".course-map-btn");
  mapButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const q = btn.dataset.query;
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`,
        "_blank"
      );
    });
  });
}

tourCourseBtn.addEventListener("click", () => {
  const area = tourAreaInput.value.trim();
  if (!area) {
    alert("Please enter a travel area for the course.");
    return;
  }

  // 코스 렌더링
  renderCourse(area, selectedStyle);

  // 🔥 코스 + 지도 풀사이즈 모드로 전환
  document.body.classList.add("full-course-view");
});

/**********************
 * FOOD INFO DATABASE
 **********************/
const foodInfo = {
  // (네가 적어준 foodInfo 그대로 – 생략 안 함)
  // China
  "Dim Sum": {
    country: "China",
    flag: "🇨🇳",
    calories: 360,
    description:
      "A variety of small Chinese dishes served in steamer baskets or plates, often enjoyed as brunch with tea."
  },
  "Chinese Eight Treasure Stir-fry": {
    country: "China",
    flag: "🇨🇳",
    calories: 293,
    description:
      "A sweet dessert pudding made with glutinous rice and assorted dried fruits and nuts."
  },
  "Dongpo Pork": {
    country: "China",
    flag: "🇨🇳",
    calories: 603,
    description:
      "Braised pork belly cooked with soy sauce, sugar, and wine, resulting in rich and tender flavors."
  },
   "Jjamppong": {
    country: "China",
    flag: "🇨🇳",
    calories: 713,
    description:
      "Spicy mixed seafood noodle soup with vegetables, originally from China but popular in Korea too.",
    compareText:
      "Jjamppong looks like ramen but has a red, very spicy broth with seafood and many vegetables, coming from Chinese–Korean cuisine.",
    compareImages: ["Jjamppong", "Japanese ramen"]
  },
  "Kkanpunggi": {
    country: "China",
    flag: "🇨🇳",
    calories: 865,
    description:
      "Spicy, garlicky fried chicken or shrimp, stir-fried with vegetables in Chinese-Korean cuisine."
  },

  "Hot Pot": {
    country: "China",
    flag: "🇨🇳",
    calories: 485,
    description:
      "A communal dish where diners cook meats and vegetables in a simmering pot of broth at the table."
  },
  "Mapo Tofu": {
    country: "China",
    flag: "🇨🇳",
    calories: 420,
    description:
      "Spicy Sichuan dish featuring tofu and ground meat in chili and bean-based sauce."
  },
  "Peking Duck": {
    country: "China",
    flag: "🇨🇳",
    calories: 465,
    description:
      "Famous Beijing dish with crispy duck skin and tender meat, typically served with pancakes and sweet sauce."
  },

  // Japan
  "Sushi": {
  country: "Japan",
  flag: "🇯🇵",
  calories: 350,
  description:
    "Vinegared rice combined with seafood, vegetables, or egg; the most iconic dish of Japanese cuisine.",
  compareText:
    "Often confused with Korean kimbap, but sushi uses vinegared rice and often raw seafood, so the taste is more sour and clean.",
  compareImages: ["Sushi", "Kimbap"]
  },
  "Miso_Soup": {
    country: "Japan",
    flag: "🇯🇵",
    calories: 50,
    description:
      "Classic Japanese soup made with fermented soybean paste, seaweed, tofu, and green onion."
  },
  "Ramen": {
  country: "Japan",
  flag: "🇯🇵",
  calories: 500,
  description:
    "Noodle soup served in meat or fish-based broth with toppings like pork, egg, and vegetables.",
  compareText:
    "Ramen is often confused with Korean spicy noodles, but ramen usually has thicker, slow-cooked broth and toppings like chashu and soft-boiled egg.",
  compareImages: ["Japanese ramen", "Jjamppong"]
  },
  "Takoyaki": {
    country: "Japan",
    flag: "🇯🇵",
    calories: 400,
    description:
      "Ball-shaped snacks with diced octopus, fried in wheat batter and topped with sauce and bonito flakes."
  },
  "Tempura": {
    country: "Japan",
    flag: "🇯🇵",
    calories: 400,
    description:
      "Seafood or vegetables battered and deep-fried until light and crispy."
  },
  "Katsu Don": {
    country: "Japan",
    flag: "🇯🇵",
    calories: 540,
    description:
      "Rice bowl topped with breaded pork cutlet and egg simmered in savory sauce."
  },
  "Okonomiyaki": {
    country: "Japan",
    flag: "🇯🇵",
    calories: 410,
    description:
      "Savory pancake with cabbage, meat or seafood, and sweet sauce plus mayonnaise."
  },
  "Sukiyaki": {
    country: "Japan",
    flag: "🇯🇵",
    calories: 630,
    description:
      "Hot pot dish of beef, tofu, and vegetables simmered in sweet soy-based broth."
  },

  // Korea
  "Bibimbap": {
  country: "Korea",
  flag: "🇰🇷",
  calories: 460,
  description:
    "Rice dish topped with assorted vegetables, egg, and chili paste, served in a hot bowl."
  },
  "Bulgogi": {
    country: "Korea",
    flag: "🇰🇷",
    calories: 250,
    description:
      "Grilled marinated beef or pork, sweet and savory."
  },
  "Kimchi Jjigae": {
    country: "Korea",
    flag: "🇰🇷",
    calories: 400,
    description:
      "Spicy stew made from kimchi, pork, and vegetables."
  },
  "Samgyeopsal": {
    country: "Korea",
    flag: "🇰🇷",
    calories: 180,
    description:
      "Unseasoned pork belly slices grilled at the table and eaten with dipping sauces."
  },
  // Korea
  "Kimbap": {
  country: "Korea",
  flag: "🇰🇷",
  calories: 125,
  description:
    "Seaweed rice roll filled with vegetables, egg, and meat; a popular Korean picnic snack.",
  compareText:
    "Looks similar to Japanese sushi rolls, but kimbap uses sesame oil rice and mostly cooked fillings, so the taste is more savory and less sour.",
  compareImages: ["Kimbap", "Sushi"]
 },
  "Doenjang Jjigae": {
    country: "Korea",
    flag: "🇰🇷",
    calories: 280,
    description:
      "Hearty stew with soybean paste, tofu, and a mix of vegetables."
  },
  "Japchae": {
    country: "Korea",
    flag: "🇰🇷",
    calories: 220,
    description:
      "Stir-fried sweet potato glass noodles with vegetables and beef in soy sauce-based glaze."
  },
  "Tteokbokki": {
    country: "Korea",
    flag: "🇰🇷",
    calories: 480,
    description:
      "Chewy rice cakes cooked in spicy gochujang sauce, often with fish cake and boiled egg."
  },

  // Thailand
  "Pad Thai": {
    country: "Thailand",
    flag: "🇹🇭",
    calories: 357,
    description:
      "Stir-fried rice noodles with egg, shrimp or chicken, peanuts, and tamarind sauce."
  },
  "Tom Yum Goong": {
    country: "Thailand",
    flag: "🇹🇭",
    calories: 196,
    description:
      "Spicy and sour shrimp soup flavored with lemongrass, kaffir lime, and chili."
  },
  "Khao Pad": {
    country: "Thailand",
    flag: "🇹🇭",
    calories: 555,
    description:
      "Thai fried rice with meat or seafood, egg, and vegetables."
  },
  "Som Tam": {
    country: "Thailand",
    flag: "🇹🇭",
    calories: 122,
    description:
      "Spicy green papaya salad mixed with chili, lime, fish sauce, and peanuts."
  },
  "Green Curry": {
    country: "Thailand",
    flag: "🇹🇭",
    calories: 620,
    description:
      "Thai curry in coconut milk, with green chili, meat, and assorted vegetables."
  },
  "Massaman Curry": {
    country: "Thailand",
    flag: "🇹🇭",
    calories: 530,
    description:
      "Rich and mild curry with coconut milk, potato, peanuts, influenced by Indian spices."
  },
  "Pad kra phao": {
    country: "Thailand",
    flag: "🇹🇭",
    calories: 410,
    description:
      "Stir-fried meat with garlic, chili, and holy basil, topped with fried egg."
  },
  "Mango Sticky Rice": {
    country: "Thailand",
    flag: "🇹🇭",
    calories: 350,
    description:
      "Sweet glutinous rice topped with coconut milk and slices of ripe mango."
  }
};

/**********************
 * LANGUAGE TRANSLATION FOR RESTAURANT SEARCH
 **********************/
function translateWord(country, word) {
  const dict = {
    Korea: "맛집",
    Japan: "美味しい店",
    China: "好吃的餐厅",
    Thailand: "ร้านอาหารอร่อย"
  };
  return dict[country] || word;
}

/**********************
 * CALORIE EMOJI
 **********************/
function calorieEmoji(cal) {
  if (cal < 500) return "🟡";
  if (cal <= 700) return "🔵";
  return "🔴";
}

/**********************
 * ASCII BAR (확률 막대)
 **********************/
function makeAsciiBar(prob) {
  const totalBlocks = 20;
  const filled = Math.round(prob * totalBlocks);
  let bar = "";
  for (let i = 0; i < totalBlocks; i++) {
    bar += i < filled ? "█" : "░";
  }
  return bar;
}

/**********************
 * STATUS UPDATE
 **********************/
function setStatus(text) {
  statusEl.innerHTML = `
    ${text}<br>
    <span class="calorie-guide">
      Calorie guide — 🟡: < 500 kcal, 🔵: 500–700 kcal, 🔴: > 700 kcal.
    </span>`;
}

/**********************
 * LOAD MODEL
 **********************/
let model;
let isModelReady = false;

window.addEventListener("load", async () => {
  try {
    model = await tmImage.load(
      MODEL_URL + "model.json",
      MODEL_URL + "metadata.json"
    );
    isModelReady = true;
    setStatus("Model loaded! Upload a food image.");
  } catch (e) {
    console.error(e);
    setStatus("Model failed to load.");
  }
});

/**********************
 * FILE UPLOAD
 **********************/
fileInput.addEventListener("change", handleUpload);

function handleUpload(e) {
  // 아두이노 연결 체크
  const useArduinoToggle = document.getElementById("use-arduino-toggle");
  const useArduino = useArduinoToggle ? useArduinoToggle.checked : false;

  if (useArduino && !isArduinoConnected) {
    alert("먼저 'Connect Arduino' 버튼으로 아두이노를 연결해 주세요!");
    fileInput.value = "";
    return;
  }

  classifierSection.style.display = "block";

  const file = e.target.files[0];
  if (!file || !isModelReady) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    previewImage.src = ev.target.result;
    previewImage.onload = () => predict(previewImage);
  };
  reader.readAsDataURL(file);
}


/**********************
 * PREDICT IMAGE
 **********************/
async function predict(img) {
  setStatus("Predicting…");

  const prediction = await model.predict(img);
  prediction.sort((a, b) => b.probability - a.probability);

  const top = prediction[0];

  // 1) 50% 미만이면: 가장 가능성 높은 음식만 보여주고 경고
  if (top.probability < 0.5) {
    const infoGuess = foodInfo[top.className];

    const guessLine = infoGuess
      ? `${infoGuess.flag} <strong>${infoGuess.country}</strong> — ${top.className}`
      : `<strong>${top.className}</strong>`;

    resultCountry.innerHTML = `
      <h3>🌏 Not confident (below 50%)</h3>
      <p>
        Most likely: ${guessLine}
        <span class="prob">(${(top.probability * 100).toFixed(1)}%)</span><br>
        Try a clearer photo or another angle.
      </p>
    `;

    resultList.innerHTML = "";
    prediction.slice(0, 3).forEach((p) => {
      const bar = makeAsciiBar(p.probability);
      resultList.innerHTML += `
        <div class="ascii-row">
          <div class="ascii-text">
            ${p.className} — ${(p.probability * 100).toFixed(1)}%
          </div>
          <div class="ascii-bar">${bar}</div>
        </div>
      `;
    });

    recommendationBox.innerHTML = "";
    foodRestaurantBtn.classList.remove("show");
    document.body.classList.add("view-food-only");
    setStatus("Prediction complete, but confidence is low.");
    return;
  }

  // 2) 50% 이상: 정상 결과
  const info = foodInfo[top.className];
  document.body.classList.add("view-food-only");

  if (!info) {
    resultCountry.innerHTML = `<h3>Unknown Food: ${top.className}</h3>`;
    resultList.innerHTML = "";
    recommendationBox.innerHTML = "";
    foodRestaurantBtn.classList.remove("show");
    setStatus("Prediction complete!");
    return;
  }

  // 🔍 비교 섹션 문자열 만들기
  let compareSection = "";
  if (info.compareText || (info.compareImages && info.compareImages.length > 0)) {
    compareSection += `<div class="compare-box">`;
    compareSection += `<div class="compare-title">🔍 Food comparison tip</div>`;
    if (info.compareText) {
      compareSection += `<p class="compare-body">${info.compareText}</p>`;
    }
    if (info.compareImages && info.compareImages.length > 0) {
      compareSection += `<div class="compare-img-row">`;
      info.compareImages.forEach((q) => {
        compareSection += `
          <button type="button" class="compare-img-btn" data-query="${q}">
            📷 See ${q} photos
          </button>
        `;
      });
      compareSection += `</div>`;
    }
    compareSection += `</div>`;
  }

  // 메인 매칭 카드 (이름 + 설명 + 칼로리 + 비교 박스)
  resultCountry.innerHTML = `
    <div class="main-result-line">
      ${info.flag} <strong>${info.country}</strong> — ${top.className}
      <span class="prob">(${(top.probability * 100).toFixed(1)}%)</span>
    </div>
    <div class="food-desc">
      ${info.description}
    </div>
    <div class="sub-info">
      ${calorieEmoji(info.calories)} ${info.calories} kcal
    </div>
    ${compareSection}
  `;

  //마지막 칼로리 기억해 두기
  lastCalories = info.calories;
  
  // 아두이노로 칼로리 
  sendCaloriesToArduino(info.calories);

  // 🔍 이미지 버튼 클릭 시 구글 이미지 검색 열기
  const imgBtns = resultCountry.querySelectorAll(".compare-img-btn");
  imgBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const q = btn.dataset.query;
      window.open(
        `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q)}`,
        "_blank"
      );
    });
  });

  // Top-3 리스트 (ASCII bar + kcal)
  resultList.innerHTML = "";
  prediction.slice(0, 3).forEach((p) => {
    const item = foodInfo[p.className];
    const percentage = (p.probability * 100).toFixed(1);
    const bar = makeAsciiBar(p.probability);
    const prefix = item ? `${item.flag} ${item.country}` : "🌏";
    const kcal = item ? `${item.calories} kcal` : "";

    resultList.innerHTML += `
      <div class="ascii-row">
        <div class="ascii-text">
          ${prefix} — ${p.className}: ${percentage}% ${kcal ? "· " + kcal : ""}
        </div>
        <div class="ascii-bar">${bar}</div>
      </div>
    `;
  });

  // 맛집 검색 버튼 노출
  foodRestaurantBtn.dataset.food = top.className;
  foodRestaurantBtn.dataset.country = info.country;
  foodRestaurantBtn.classList.add("show");

  setStatus("Prediction complete!");
}


/**********************
 * FOOD → RESTAURANT SEARCH
 **********************/
foodRestaurantBtn.addEventListener("click", () => {
  const food = foodRestaurantBtn.dataset.food;
  const country = foodRestaurantBtn.dataset.country;

  const queryTranslated = translateWord(country, "restaurant");
  const query = `${food} ${queryTranslated}`;

  window.open(
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
    "_blank"
  );
});

/**********************
 * MAIN TRAVEL MENU SWITCH
 **********************/
function goHome() {
  // body 상태 초기화 (풀사이즈 모드까지 전부 해제)
  document.body.classList.remove(
    "show-detail",
    "view-food-only",
    "view-travel-only",
    "full-course-view"
  );

  // 아래 상세 컨테이너 다시 숨기기
  container.classList.add("hidden-at-start");

  // 위 3개 카드 다시 보이게
  homeMenu.style.display = "flex";

  // 여행 내부 화면도 초기화 (메인메뉴 보이게)
  mainMenu.classList.remove("hidden");
  touristMode.classList.add("hidden");
  restaurantMode.classList.add("hidden");
}


btnTourist.addEventListener("click", () => {
  mainMenu.classList.add("hidden");
  touristMode.classList.remove("hidden");
  document.body.classList.add("view-travel-only");
});

btnFood.addEventListener("click", () => {
  mainMenu.classList.add("hidden");
  restaurantMode.classList.remove("hidden");
  document.body.classList.add("view-travel-only");
});


/**********************
 * RESTAURANT MODE — SEARCH
 **********************/
travelSearchBtn.addEventListener("click", () => {
  const country = travelCountry.value;
  const location = travelLocation.value.trim();

  if (!location) {
    alert("Please enter a location.");
    return;
  }

  const word = translateWord(country, "restaurant");
  const query = `${location} ${word}`;

  window.open(
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
    "_blank"
  );

  mapLinks.innerHTML = `
    <p>Opened Google Maps search for:<br>
    <strong>${query}</strong></p>
  `;
});

document.querySelectorAll(".back-btn").forEach(btn => {
  btn.addEventListener("click", goHome);
});

// ===========================
// Arduino 연결 관련 코드
// ===========================


function setArduinoStatus(text) {
  const el = document.getElementById("arduino-status");
  if (el) el.textContent = text;
}

async function toggleArduinoConnection() {
  try {
    // 아직 연결 안 됐으면 → 연결
    if (!isArduinoConnected) {
      if (!("serial" in navigator)) {
        alert("이 브라우저에서는 Web Serial API를 지원하지 않습니다. (Chrome/Edge 사용 권장)");
        return;
      }

      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 }); // ⚠ 아두이노 코드의 Serial.begin(9600)과 동일하게

      const textEncoder = new TextEncoderStream();
      textEncoder.readable.pipeTo(port.writable);
      const writer = textEncoder.writable.getWriter();

      arduinoPort = port;
      arduinoWriter = writer;
      isArduinoConnected = true;

      const btn = document.getElementById("connect-arduino-btn");
      if (btn) btn.textContent = "Disconnect Arduino";
      setArduinoStatus("Connected");
      console.log("Arduino connected");
     // 직전에 예측된 칼로리가 있으면 한 번 더 보내기
      if (lastCalories !== null) {
        sendCaloriesToArduino(lastCalories);}
    }
    // 이미 연결되어 있으면 → 해제
    else {
      if (arduinoWriter) {
        await arduinoWriter.close();
      }
      if (arduinoPort) {
        await arduinoPort.close();
      }

      arduinoPort = null;
      arduinoWriter = null;
      isArduinoConnected = false;

      const btn = document.getElementById("connect-arduino-btn");
      if (btn) btn.textContent = "Connect Arduino";
      setArduinoStatus("Not connected");
      console.log("Arduino disconnected");
    }
  } catch (err) {
    console.error("Arduino connection error:", err);
    alert("Arduino 연결 중 오류가 발생했습니다. 콘솔을 확인해 주세요.");
  }
}

// 페이지 로드되면 버튼 이벤트 연결
document.addEventListener("DOMContentLoaded", () => {
  const connectBtn = document.getElementById("connect-arduino-btn");
  if (connectBtn) {
    connectBtn.addEventListener("click", toggleArduinoConnection);
  }
});

/**
 * 칼로리를 아두이노로 보내는 함수
 * @param {number} totalCalories - 한 끼 칼로리 값
 */
async function sendCaloriesToArduino(totalCalories) {
  const useArduinoToggle = document.getElementById("use-arduino-toggle");
  const useArduino = useArduinoToggle ? useArduinoToggle.checked : false;

  // 체크박스 꺼져 있으면 아두이노 사용 안 함
  if (!useArduino) {
    console.log("Use Arduino LED unchecked, skip sending.");
    return;
  }

  // 연결 안 되어 있으면 전송 X
  if (!isArduinoConnected || !arduinoWriter) {
    console.log(
      "Arduino NOT ready (connected:",
      isArduinoConnected,
      "writer:",
      !!arduinoWriter,
      "). Skip sending."
    );
    return;
  }

  let command = "";
  if (totalCalories > 700) {
    command = "RED";        // 🔴 > 700 kcal
  } else if (totalCalories >= 500) {
    command = "BLUE";       // 🔵 500–700 kcal
  } else {
    command = "YELLOW";     // 🟡 < 500 kcal
  }

  try {
    await arduinoWriter.write(command + "\n");
    console.log(`Sent to Arduino: ${command} (calories: ${totalCalories})`);
  } catch (err) {
    console.error("Error sending data to Arduino:", err);
  }
}




















