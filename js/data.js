// ============================================================
// VOCABULARY DATA — Organized by topic
// Each word: { id, word, phonetic, meaning, example, pos }
// ============================================================

const TOPICS = [
  {
    id: "topic_business",
    name: "Business & Work",
    icon: "💼",
    color: "#6366f1",
    description: "Essential vocabulary for the workplace",
    words: [
      { id: "biz_1",  word: "negotiate",  phonetic: "/nɪˈɡoʊʃieɪt/", pos: "verb",  meaning: "Đàm phán",        example: "We need to negotiate the contract terms carefully." },
      { id: "biz_2",  word: "revenue",    phonetic: "/ˈrevənjuː/",    pos: "noun",  meaning: "Doanh thu",       example: "The company's annual revenue exceeded expectations." },
      { id: "biz_3",  word: "strategy",   phonetic: "/ˈstrætədʒi/",   pos: "noun",  meaning: "Chiến lược",      example: "A strong marketing strategy is essential for growth." },
      { id: "biz_4",  word: "invest",     phonetic: "/ɪnˈvest/",      pos: "verb",  meaning: "Đầu tư",          example: "She decided to invest in renewable energy stocks." },
      { id: "biz_5",  word: "deadline",   phonetic: "/ˈdedlaɪn/",     pos: "noun",  meaning: "Hạn chót",        example: "We must submit the report before the deadline." },
      { id: "biz_6",  word: "collaborate",phonetic: "/kəˈlæbəreɪt/",  pos: "verb",  meaning: "Hợp tác",         example: "The two teams collaborated on the new product launch." },
      { id: "biz_7",  word: "budget",     phonetic: "/ˈbʌdʒɪt/",      pos: "noun",  meaning: "Ngân sách",       example: "The project was completed within budget." },
      { id: "biz_8",  word: "efficient",  phonetic: "/ɪˈfɪʃnt/",      pos: "adj",   meaning: "Hiệu quả",        example: "An efficient workflow saves time and resources." },
      { id: "biz_9",  word: "entrepreneur",phonetic: "/ˌɑːntrəprəˈnɜːr/", pos: "noun", meaning: "Doanh nhân", example: "The entrepreneur launched three startups by age 30." },
      { id: "biz_10", word: "forecast",   phonetic: "/ˈfɔːrkæst/",    pos: "noun",  meaning: "Dự báo",          example: "The sales forecast looks promising for Q3." },
      { id: "biz_11", word: "merger",     phonetic: "/ˈmɜːrdʒər/",    pos: "noun",  meaning: "Sáp nhập",        example: "The merger created one of the largest banks in Asia." },
      { id: "biz_12", word: "delegate",   phonetic: "/ˈdelɪɡeɪt/",    pos: "verb",  meaning: "Giao việc",       example: "Good managers know how to delegate tasks effectively." },
      { id: "biz_13", word: "benchmark",  phonetic: "/ˈbentʃmɑːrk/",  pos: "noun",  meaning: "Tiêu chuẩn",      example: "The benchmark for performance was set by industry leaders." },
      { id: "biz_14", word: "compliance", phonetic: "/kəmˈplaɪəns/",   pos: "noun",  meaning: "Sự tuân thủ",    example: "All employees must ensure regulatory compliance." },
      { id: "biz_15", word: "liability",  phonetic: "/ˌlaɪəˈbɪlɪti/", pos: "noun",  meaning: "Trách nhiệm pháp lý", example: "The company accepted liability for the accident." }
    ]
  },
  {
    id: "topic_travel",
    name: "Travel & Destinations",
    icon: "✈️",
    color: "#0ea5e9",
    description: "Words for exploring the world",
    words: [
      { id: "trv_1",  word: "itinerary",  phonetic: "/aɪˈtɪnəreri/",  pos: "noun",  meaning: "Lịch trình",      example: "Please send me the travel itinerary before we depart." },
      { id: "trv_2",  word: "customs",    phonetic: "/ˈkʌstəmz/",     pos: "noun",  meaning: "Hải quan",        example: "All passengers must go through customs upon arrival." },
      { id: "trv_3",  word: "souvenir",   phonetic: "/ˌsuːvəˈnɪr/",   pos: "noun",  meaning: "Quà lưu niệm",    example: "She bought a souvenir magnet from every city she visited." },
      { id: "trv_4",  word: "departure",  phonetic: "/dɪˈpɑːrtʃər/",  pos: "noun",  meaning: "Khởi hành",       example: "The departure gate for our flight is B12." },
      { id: "trv_5",  word: "destination",phonetic: "/ˌdestɪˈneɪʃn/", pos: "noun",  meaning: "Điểm đến",        example: "Bali is a popular tourist destination." },
      { id: "trv_6",  word: "layover",    phonetic: "/ˈleɪoʊvər/",    pos: "noun",  meaning: "Quá cảnh",        example: "We have a 3-hour layover in Singapore." },
      { id: "trv_7",  word: "expedition", phonetic: "/ˌekspɪˈdɪʃn/",  pos: "noun",  meaning: "Cuộc thám hiểm",  example: "The expedition to the Amazon lasted two months." },
      { id: "trv_8",  word: "hostel",     phonetic: "/ˈhɒstl/",       pos: "noun",  meaning: "Nhà trọ",         example: "Budget travelers often stay at a hostel." },
      { id: "trv_9",  word: "currency",   phonetic: "/ˈkɜːrənsi/",    pos: "noun",  meaning: "Tiền tệ",         example: "Exchange your currency before you arrive." },
      { id: "trv_10", word: "passport",   phonetic: "/ˈpæspɔːrt/",    pos: "noun",  meaning: "Hộ chiếu",        example: "Don't forget your passport at the airport." },
      { id: "trv_11", word: "accommodation",phonetic: "/əˌkɒməˈdeɪʃn/", pos: "noun", meaning: "Chỗ ở",          example: "We booked accommodation near the beach." },
      { id: "trv_12", word: "sightseeing",phonetic: "/ˈsaɪtsiːɪŋ/",   pos: "noun",  meaning: "Tham quan",       example: "We spent the afternoon sightseeing in the old town." }
    ]
  },
  {
    id: "topic_technology",
    name: "Technology & AI",
    icon: "🤖",
    color: "#10b981",
    description: "Modern tech vocabulary for the digital age",
    words: [
      { id: "tech_1",  word: "algorithm",  phonetic: "/ˈælɡərɪðəm/",   pos: "noun",  meaning: "Thuật toán",      example: "The algorithm sorts the data in milliseconds." },
      { id: "tech_2",  word: "bandwidth",  phonetic: "/ˈbændwɪdθ/",    pos: "noun",  meaning: "Băng thông",      example: "Video streaming requires high bandwidth." },
      { id: "tech_3",  word: "cybersecurity",phonetic: "/ˈsaɪbərsɪkjʊərɪti/", pos: "noun", meaning: "An ninh mạng", example: "Cybersecurity threats are increasing globally." },
      { id: "tech_4",  word: "database",   phonetic: "/ˈdeɪtəbeɪs/",   pos: "noun",  meaning: "Cơ sở dữ liệu",   example: "All customer information is stored in the database." },
      { id: "tech_5",  word: "encryption", phonetic: "/ɪnˈkrɪpʃn/",    pos: "noun",  meaning: "Mã hóa",          example: "End-to-end encryption protects your messages." },
      { id: "tech_6",  word: "interface",  phonetic: "/ˈɪntərfeɪs/",   pos: "noun",  meaning: "Giao diện",       example: "The user interface is intuitive and easy to navigate." },
      { id: "tech_7",  word: "prototype",  phonetic: "/ˈproʊtətaɪp/",  pos: "noun",  meaning: "Nguyên mẫu",      example: "They built a prototype of the app in two weeks." },
      { id: "tech_8",  word: "automate",   phonetic: "/ˈɔːtəmeɪt/",    pos: "verb",  meaning: "Tự động hóa",     example: "We can automate repetitive tasks using scripts." },
      { id: "tech_9",  word: "deploy",     phonetic: "/dɪˈplɔɪ/",      pos: "verb",  meaning: "Triển khai",      example: "The new version was deployed to production today." },
      { id: "tech_10", word: "scalable",   phonetic: "/ˈskeɪləbl/",    pos: "adj",   meaning: "Có thể mở rộng",  example: "The architecture must be scalable to handle growth." },
      { id: "tech_11", word: "latency",    phonetic: "/ˈleɪtənsi/",    pos: "noun",  meaning: "Độ trễ",          example: "Low latency is crucial for real-time applications." },
      { id: "tech_12", word: "framework",  phonetic: "/ˈfreɪmwɜːrk/",  pos: "noun",  meaning: "Khung phát triển",example: "React is a popular JavaScript framework." },
      { id: "tech_13", word: "iteration",  phonetic: "/ˌɪtəˈreɪʃn/",   pos: "noun",  meaning: "Vòng lặp / Lần thử", example: "Each iteration improved the product significantly." },
      { id: "tech_14", word: "neural network",phonetic: "/ˈnjʊərəl ˈnetwɜːrk/", pos: "noun", meaning: "Mạng nơ-ron", example: "Neural networks power most modern AI systems." }
    ]
  },
  {
    id: "topic_health",
    name: "Health & Wellness",
    icon: "🏥",
    color: "#f43f5e",
    description: "Medical and wellness vocabulary",
    words: [
      { id: "hlth_1",  word: "diagnosis",  phonetic: "/ˌdaɪəɡˈnoʊsɪs/", pos: "noun", meaning: "Chẩn đoán",      example: "The doctor gave a diagnosis after running tests." },
      { id: "hlth_2",  word: "prescription",phonetic: "/prɪˈskrɪpʃn/",  pos: "noun", meaning: "Đơn thuốc",       example: "You'll need a prescription for that medication." },
      { id: "hlth_3",  word: "symptom",    phonetic: "/ˈsɪmptəm/",      pos: "noun", meaning: "Triệu chứng",     example: "Fever is a common symptom of the flu." },
      { id: "hlth_4",  word: "immune",     phonetic: "/ɪˈmjuːn/",       pos: "adj",  meaning: "Miễn dịch",       example: "A healthy diet keeps your immune system strong." },
      { id: "hlth_5",  word: "chronic",    phonetic: "/ˈkrɒnɪk/",       pos: "adj",  meaning: "Mãn tính",        example: "Chronic back pain can significantly affect daily life." },
      { id: "hlth_6",  word: "rehabilitation",phonetic: "/ˌriːhəˌbɪlɪˈteɪʃn/", pos: "noun", meaning: "Phục hồi chức năng", example: "He needed months of rehabilitation after surgery." },
      { id: "hlth_7",  word: "nutrition",  phonetic: "/njuːˈtrɪʃn/",    pos: "noun", meaning: "Dinh dưỡng",      example: "Good nutrition is the foundation of good health." },
      { id: "hlth_8",  word: "vaccine",    phonetic: "/ˈvæksiːn/",      pos: "noun", meaning: "Vắc-xin",         example: "The vaccine provides protection against the virus." },
      { id: "hlth_9",  word: "allergy",    phonetic: "/ˈælərdʒi/",      pos: "noun", meaning: "Dị ứng",          example: "She has a severe allergy to peanuts." },
      { id: "hlth_10", word: "mental health",phonetic: "/ˈmentl helθ/", pos: "noun", meaning: "Sức khỏe tâm thần", example: "Taking care of mental health is as important as physical health." },
      { id: "hlth_11", word: "inflammation",phonetic: "/ˌɪnfləˈmeɪʃn/", pos: "noun", meaning: "Viêm",            example: "The doctor prescribed medicine to reduce inflammation." },
      { id: "hlth_12", word: "cardiology", phonetic: "/ˌkɑːrdiˈɒlədʒi/", pos: "noun", meaning: "Tim mạch học", example: "He specializes in cardiology at the hospital." }
    ]
  },
  {
    id: "topic_nature",
    name: "Nature & Environment",
    icon: "🌿",
    color: "#84cc16",
    description: "Words about the natural world",
    words: [
      { id: "nat_1",  word: "ecosystem",  phonetic: "/ˈiːkəʊsɪstəm/",  pos: "noun", meaning: "Hệ sinh thái",    example: "The coral reef is a diverse and fragile ecosystem." },
      { id: "nat_2",  word: "biodiversity",phonetic: "/ˌbaɪoʊdaɪˈvɜːrsɪti/", pos: "noun", meaning: "Đa dạng sinh học", example: "The Amazon rainforest has incredible biodiversity." },
      { id: "nat_3",  word: "erosion",    phonetic: "/ɪˈroʊʒn/",        pos: "noun", meaning: "Xói mòn",         example: "Soil erosion is a serious environmental problem." },
      { id: "nat_4",  word: "sustainable",phonetic: "/səˈsteɪnəbl/",    pos: "adj",  meaning: "Bền vững",        example: "We need sustainable energy solutions for the future." },
      { id: "nat_5",  word: "extinction", phonetic: "/ɪkˈstɪŋkʃn/",    pos: "noun", meaning: "Tuyệt chủng",     example: "Many species face extinction due to habitat loss." },
      { id: "nat_6",  word: "glacier",    phonetic: "/ˈɡleɪʃər/",       pos: "noun", meaning: "Sông băng",       example: "Glaciers are melting due to global warming." },
      { id: "nat_7",  word: "drought",    phonetic: "/draʊt/",           pos: "noun", meaning: "Hạn hán",         example: "The region experienced a severe drought last summer." },
      { id: "nat_8",  word: "deforestation",phonetic: "/ˌdiːˌfɒrɪˈsteɪʃn/", pos: "noun", meaning: "Phá rừng",  example: "Deforestation is a leading cause of climate change." },
      { id: "nat_9",  word: "precipitation",phonetic: "/prɪˌsɪpɪˈteɪʃn/", pos: "noun", meaning: "Lượng mưa",  example: "The region receives high precipitation in winter." },
      { id: "nat_10", word: "fauna",      phonetic: "/ˈfɔːnə/",         pos: "noun", meaning: "Động vật hoang dã", example: "Australia is known for its unique fauna." },
      { id: "nat_11", word: "flora",      phonetic: "/ˈflɔːrə/",        pos: "noun", meaning: "Thực vật",        example: "The flora of the tropical rainforest is extraordinary." }
    ]
  },
  {
    id: "topic_emotions",
    name: "Emotions & Feelings",
    icon: "😊",
    color: "#f59e0b",
    description: "Express yourself precisely in English",
    words: [
      { id: "emo_1",  word: "melancholy", phonetic: "/ˈmelənkɒli/",    pos: "noun", meaning: "Sự u sầu",        example: "There was a sense of melancholy in her voice." },
      { id: "emo_2",  word: "euphoric",   phonetic: "/juːˈfɒrɪk/",     pos: "adj",  meaning: "Hưng phấn tột độ",example: "She felt euphoric after winning the championship." },
      { id: "emo_3",  word: "anxious",    phonetic: "/ˈæŋkʃəs/",       pos: "adj",  meaning: "Lo lắng",         example: "He felt anxious before the big presentation." },
      { id: "emo_4",  word: "nostalgic",  phonetic: "/nɒˈstældʒɪk/",   pos: "adj",  meaning: "Hoài niệm",       example: "Old photos always make me feel nostalgic." },
      { id: "emo_5",  word: "bewildered", phonetic: "/bɪˈwɪldərd/",    pos: "adj",  meaning: "Bối rối",         example: "She was bewildered by the sudden change in plans." },
      { id: "emo_6",  word: "empathy",    phonetic: "/ˈempəθi/",        pos: "noun", meaning: "Sự đồng cảm",     example: "Empathy is the ability to understand others' feelings." },
      { id: "emo_7",  word: "resilient",  phonetic: "/rɪˈzɪliənt/",    pos: "adj",  meaning: "Kiên cường",      example: "She remained resilient despite all the challenges." },
      { id: "emo_8",  word: "serene",     phonetic: "/səˈriːn/",        pos: "adj",  meaning: "Bình yên",        example: "The morning was calm and serene by the lake." },
      { id: "emo_9",  word: "exasperated",phonetic: "/ɪɡˈzæspəreɪtɪd/", pos: "adj", meaning: "Vô cùng bực bội", example: "He was exasperated by the constant interruptions." },
      { id: "emo_10", word: "content",    phonetic: "/kənˈtent/",       pos: "adj",  meaning: "Hài lòng",        example: "She felt content with her simple but meaningful life." }
    ]
  },
  {
    id: "topic_academic",
    name: "Academic & IELTS",
    icon: "📚",
    color: "#8b5cf6",
    description: "High-frequency words for IELTS & academic writing",
    words: [
      { id: "aca_1",  word: "hypothesis", phonetic: "/haɪˈpɒθɪsɪs/",   pos: "noun", meaning: "Giả thuyết",      example: "The scientist proposed a hypothesis about climate change." },
      { id: "aca_2",  word: "empirical",  phonetic: "/ɪmˈpɪrɪkl/",     pos: "adj",  meaning: "Thực nghiệm",     example: "The study is based on empirical evidence." },
      { id: "aca_3",  word: "analyze",    phonetic: "/ˈænəlaɪz/",       pos: "verb", meaning: "Phân tích",       example: "We need to analyze the data before drawing conclusions." },
      { id: "aca_4",  word: "significant",phonetic: "/sɪɡˈnɪfɪkənt/",  pos: "adj",  meaning: "Đáng kể",         example: "There was a significant improvement in test scores." },
      { id: "aca_5",  word: "concede",    phonetic: "/kənˈsiːd/",       pos: "verb", meaning: "Nhượng bộ / Thừa nhận", example: "I concede that the initial approach was flawed." },
      { id: "aca_6",  word: "ambiguous",  phonetic: "/æmˈbɪɡjuəs/",    pos: "adj",  meaning: "Mơ hồ",           example: "The instructions were ambiguous and confusing." },
      { id: "aca_7",  word: "coherent",   phonetic: "/koʊˈhɪrənt/",    pos: "adj",  meaning: "Mạch lạc",        example: "The essay was coherent and well-structured." },
      { id: "aca_8",  word: "prevalent",  phonetic: "/ˈprevələnt/",     pos: "adj",  meaning: "Phổ biến",        example: "Smartphone addiction is prevalent among teenagers." },
      { id: "aca_9",  word: "controversial",phonetic: "/ˌkɒntrəˈvɜːʃl/", pos: "adj", meaning: "Gây tranh cãi",  example: "The policy change was highly controversial." },
      { id: "aca_10", word: "elaborate",  phonetic: "/ɪˈlæbərət/",      pos: "verb", meaning: "Trình bày chi tiết", example: "Could you elaborate on your point about education?" },
      { id: "aca_11", word: "implication",phonetic: "/ˌɪmplɪˈkeɪʃn/",  pos: "noun", meaning: "Hàm ý / Tác động",example: "The implications of climate change are far-reaching." },
      { id: "aca_12", word: "paradigm",   phonetic: "/ˈpærədaɪm/",      pos: "noun", meaning: "Mô hình / Quan điểm", example: "This discovery represents a paradigm shift in physics." }
    ]
  },
  {
    id: "topic_food",
    name: "Food & Cooking",
    icon: "🍳",
    color: "#f97316",
    description: "Culinary vocabulary for food lovers",
    words: [
      { id: "food_1",  word: "cuisine",   phonetic: "/kwɪˈziːn/",       pos: "noun", meaning: "Ẩm thực",         example: "Italian cuisine is famous worldwide." },
      { id: "food_2",  word: "simmer",    phonetic: "/ˈsɪmər/",         pos: "verb", meaning: "Đun nhỏ lửa",     example: "Let the soup simmer for 20 minutes." },
      { id: "food_3",  word: "marinate",  phonetic: "/ˈmærɪneɪt/",      pos: "verb", meaning: "Ướp",             example: "Marinate the chicken in spices overnight." },
      { id: "food_4",  word: "garnish",   phonetic: "/ˈɡɑːrnɪʃ/",       pos: "verb", meaning: "Trang trí món ăn",example: "Garnish the dish with fresh parsley." },
      { id: "food_5",  word: "savory",    phonetic: "/ˈseɪvəri/",        pos: "adj",  meaning: "Mặn mà / Ngon lành", example: "I prefer savory snacks over sweet ones." },
      { id: "food_6",  word: "fermented", phonetic: "/fɜːˈmentɪd/",     pos: "adj",  meaning: "Lên men",         example: "Kimchi is a fermented vegetable dish from Korea." },
      { id: "food_7",  word: "appetizer", phonetic: "/ˈæpɪtaɪzər/",     pos: "noun", meaning: "Món khai vị",     example: "They served bruschetta as an appetizer." },
      { id: "food_8",  word: "culinary",  phonetic: "/ˈkʌlɪneri/",      pos: "adj",  meaning: "Thuộc ẩm thực",   example: "She has excellent culinary skills." }
    ]
  }
];
