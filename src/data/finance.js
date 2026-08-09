(function() {
  const topic = {
    id: "topic_finance",
    name: "Tài chính & Ngân hàng",
    icon: "🏦",
    color: "#059669",
    description: "Từ vựng cốt lõi về tài chính, ngân hàng và kinh tế",
    words: [
      { id: "fin_1",  word: "asset",          phonetic: "/ˈæset/",         pos: "noun", meaning: "Tài sản",                 example: "The company’s assets include buildings and machinery." },
      { id: "fin_2",  word: "liability",      phonetic: "/ˌlaɪəˈbɪlɪti/",  pos: "noun", meaning: "Nợ phải trả",             example: "The bank calculates its total liabilities before lending." },
      { id: "fin_3",  word: "equity",         phonetic: "/ˈekwɪti/",       pos: "noun", meaning: "Vốn chủ sở hữu",          example: "She has built up equity in her home over ten years." },
      { id: "fin_4",  word: "collateral",     phonetic: "/kəˈlætərəl/",    pos: "noun", meaning: "Tài sản thế chấp",        example: "He used his house as collateral for the bank loan." },
      { id: "fin_5",  word: "liquidity",      phonetic: "/lɪˈkwɪdɪti/",    pos: "noun", meaning: "Tính thanh khoản",        example: "Cash is the financial asset with the highest liquidity." },
      { id: "fin_6",  word: "solvency",       phonetic: "/ˈsɒlvənsi/",     pos: "noun", meaning: "Khả năng thanh toán",     example: "The audit confirmed the company's long-term solvency." },
      { id: "fin_7",  word: "dividend",       phonetic: "/ˈdɪvɪdend/",     pos: "noun", meaning: "Cổ tức",                 example: "Shareholders receive a quarterly dividend on their stock." },
      { id: "fin_8",  word: "amortization",   phonetic: "/ˌæmɔːtɪˈzeɪʃn/", pos: "noun", meaning: "Sự phân bổ nợ / Khấu hao", example: "The amortization schedule shows how the loan balance decreases." },
      { id: "fin_9",  word: "depreciation",   phonetic: "/dɪˌpriːʃiˈeɪʃn/",pos: "noun", meaning: "Sự khấu hao tài sản",      example: "The company records the depreciation of its vehicles annually." },
      { id: "fin_10", word: "interest rate",  phonetic: "/ˈɪntrəst reɪt/", pos: "noun", meaning: "Lãi suất",                example: "The central bank decided to lower the interest rate." },
      { id: "fin_11", word: "inflation",      phonetic: "/ɪnˈfleɪʃn/",     pos: "noun", meaning: "Lạm phát",                example: "High inflation erodes the purchasing power of consumers." },
      { id: "fin_12", word: "recession",      phonetic: "/rɪˈseʃn/",       pos: "noun", meaning: "Suy thoái kinh tế",        example: "Many businesses went bankrupt during the economic recession." },
      { id: "fin_13", word: "portfolio",      phonetic: "/pɔːrtˈfoʊlioʊ/", pos: "noun", meaning: "Danh mục đầu tư",        example: "A diversified portfolio reduces investment risk." },
      { id: "fin_14", word: "transaction",    phonetic: "/trænˈzækʃn/",    pos: "noun", meaning: "Giao dịch",               example: "Online banking allows secure and instant financial transactions." },
      { id: "fin_15", word: "bankruptcy",     phonetic: "/ˈbæŋkrəptsi/",   pos: "noun", meaning: "Sự phá sản",               example: "The retail giant filed for bankruptcy last week." },
      { id: "fin_16", word: "capital",        phonetic: "/ˈkæpɪtl/",       pos: "noun", meaning: "Vốn / Vốn liếng",         example: "The startup is seeking venture capital for expansion." },
      { id: "fin_17", word: "default",        phonetic: "/dɪˈfɔːlt/",      pos: "verb", meaning: "Vỡ nợ / Không trả được nợ", example: "The borrower defaulted on his mortgage payments." },
      { id: "fin_18", word: "audit",          phonetic: "/ˈɔːdɪt/",        pos: "noun", meaning: "Kiểm toán",               example: "The company undergoes an independent financial audit every year." },
      { id: "fin_19", word: "revenue",        phonetic: "/ˈrevənjuː/",     pos: "noun", meaning: "Doanh thu",               example: "The government receives tax revenue from corporations." },
      { id: "fin_20", word: "yield",          phonetic: "/jiːld/",         pos: "noun", meaning: "Lợi suất",                example: "High-yield bonds offer higher returns but carry more risk." }
    ]
  };
  if (!window.TOPICS) window.TOPICS = [];
  if (!window.TOPICS.some(t => t.id === topic.id)) {
    window.TOPICS.push(topic);
  }
})();
