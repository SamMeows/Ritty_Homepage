import { homeEnglish } from './home-en'
import { translateMarkupCopy } from './translate-markup'

const chinese: Record<string, string> = {
  'One day, a cat<br>fell from the sky!': '有一天，貓咪<br>突然從天而降！',
  'A cat friend who is always there to listen': '專屬於你、總是願意傾聽的貓咪夥伴',
  'A cozy life simulation with talking cats': '和會說話的貓咪一起享受療癒日常',
  'Gray, orange, and calico Ritty cats playing on an island beneath shooting stars': '流星下，灰色、橘色和三花 Ritty 在島上玩耍',
  'Skip to content': '跳至主要內容', 'Main navigation': '主要導覽', 'Pre-register': '事前登錄',
  'Official social channels': '官方社群頻道', 'official channel': '官方頻道',
  'What shall we<br><em>do today, Ritty?</em>': '今天要和 Ritty<br><em>一起做什麼呢？</em>',
  'Meet the Ritty cats<br><em>from the Cat Planet!</em>': '來認識來自貓咪星球的<br><em>Ritty 們吧！</em>',
  'Ritty, the talking cat': '會說話的貓咪 Ritty', 'What shall we harvest today?': '今天要收成什麼呢？',
  'Plant seeds, water them and watch your crops grow. Expand your garden to grow even more.': '播下種子、澆水，看著作物慢慢長大。擴建菜園，就能種下更多作物。',
  'Gray Ritty watching you harvest crops': '看著你收成作物的灰色 Ritty', 'What shall I cook for you?': '今天要做什麼料理呢？',
  'Cook a meal with your harvest and share it with Ritty. What will their favorite food be?': '用收成的食材做成料理，和 Ritty 一起分享吧。牠最喜歡吃什麼呢？',
  'Gray Ritty waiting for a meal': '等著吃料理的灰色 Ritty', 'Make a home of your own': '打造專屬於你的家',
  'Gather materials, craft furniture and arrange it just the way you like. Expand your home to make room for more.': '收集素材、製作家具，再依照喜好自由擺設。擴建家園，就能放下更多家具。',
  'Gray Ritty checking the pieces while you build furniture': '在家具製作旁仔細查看零件的灰色 Ritty', 'Go fishing and explore the village': '去釣魚，也去村莊逛逛',
  'Cast a line into the sea, then stop by the village shops on your way home.': '到海邊享受釣魚時光，回家路上也別忘了逛逛村裡的商店。',
  'Gray Ritty watching a fishing float': '盯著浮標看的灰色 Ritty', 'Wow, did you grow this yourself?': '哇，這是你自己種的嗎？',
  'Just one bite! Can I try it now?': '只要一小口！我現在可以吃嗎？', 'New furniture? Let me see!': '新家具嗎？讓我看看！', 'It just moved! Is that a fish?': '剛剛動了一下！是魚嗎？',
  'Previous life scene': '上一個生活場景', 'Next life scene': '下一個生活場景', 'Choose a life scene': '選擇生活場景',
  'View gardening scene': '查看種菜場景', 'View cooking scene': '查看料理場景', 'View home decorating scene': '查看居家佈置場景', 'View fishing scene': '查看釣魚場景', 'Life scene': '生活場景', 'carousel': '輪播',
  'We’re getting ready<br>to meet you.': '正在準備<br>和你相遇。', 'Coming to iOS and Android.<br>Stay tuned for the release date.': '預計於 iOS 和 Android 推出。<br>敬請期待正式上線日期。',
  'All development news and announcements →': '開發消息與公告一覽 →', 'All Ritty news →': 'Ritty 最新消息一覽 →', 'Ritty News': 'Ritty 最新消息',
  'Privacy Policy': '隱私權政策', 'Terms of Service': '服務條款', 'About Us': '關於我們', 'Contact Us': '聯絡我們',
  'Communications Officer': '通訊官', 'Astronomer': '天文學家', 'Repair Shop Owner': '修理店老闆', 'Florist': '花店老闆', 'Former Star Athlete': '前職業運動員', 'Fashion Designer': '服裝設計師', 'Lyricist': '作詞家', 'A New Friend': '新朋友',
  'A communications officer who once hosted a radio show for faraway explorers, sharing their stories and song requests. Ritty hopes to turn everything they see, taste, and experience on Earth into a broadcast for the Cat Planet.': '曾經負責廣播節目的通訊官，會分享遠方探險隊員的故事和點播歌曲。Ritty 想把在地球上看見、吃到和體驗的一切，製作成節目帶回貓咪星球。',
  'Coco grew up stargazing in the countryside and became an astronomer at the capital’s observatory. Coco was the first to discover the glowing blue Earth and came to see the world they had only known through a telescope.': 'Coco 在鄉下仰望星空長大，後來成為首都天文台的天文學家。牠最先發現閃耀著藍光的地球，於是親自來看看望遠鏡另一端的世界。',
  'Leo is a skilled mechanic who ran a little repair shop on the Cat Planet. Leo doesn’t say much, but can’t walk past something broken—and has a soft spot for sweet desserts.': 'Leo 是貓咪星球上小小修理店裡的能幹師傅。牠話不多，卻從不會對故障的東西視而不見，而且最愛甜點。',
  'They ran a small flower shop because they loved seeing customers’ faces light up when they picked up their flowers. Cheerful and kind, they also have firm principles.': '開了一間小花店，只為看見客人收到花時露出笑容。個性開朗又親切，也有自己的堅持。',
  'A former star athlete from the Cat Planet. While recovering from an injury, they got hooked on game strategies and chasing high scores. On a whim, they applied to join an expedition—and ended up all the way on Earth.': '曾是貓咪星球的明星運動員。養傷期間迷上研究遊戲攻略和挑戰高分，一時興起報名參加探險，沒想到一路來到了地球。',
  'They love beautiful clothes and compliments. Usually playful and affectionate, they become completely serious when talking about design. They haven’t been able to make clothes on Earth yet.': '喜歡漂亮衣服，也愛聽別人稱讚的設計師。平常愛撒嬌又活潑，一聊到設計就會格外認真。目前還沒能在地球做出衣服。',
  'A lyricist who finds inspiration in everyday conversations and little moments. They remember your favorite foods and love listening to music together. Behind those gentle words are distinct tastes and a stubborn streak.': '擅長從日常對話和生活點滴中尋找歌詞靈感的作詞家。記得你喜歡吃什麼，也喜歡和你一起聽音樂。溫柔的話語背後，藏著自己的喜好和一點小固執。',
  'Coco': 'Coco', 'Leo': 'Leo', 'Ritty': 'Ritty', 'Home': '首頁', 'Life': '生活', 'News': '消息',
  'Singing · Dancing · Fish': '唱歌・跳舞・魚', 'Stargazing · Reading · Vegetables': '觀星・閱讀・蔬菜', 'Desserts · Walks': '甜點・散步', 'Naps · Flowers · Fish': '午睡・花・魚', 'Ball sports · Gaming · Meat': '球類・遊戲・肉', 'Fashion · Grooming': '時尚・打扮', 'Cooking · Music · Movies': '料理・音樂・電影', 'Likes: ': '喜歡：',
  'This is Earth. Can you hear me?': '這裡是地球，聽得到嗎？', 'Out on a repair call. Return date unknown.': '外出維修中。歸期未定。',
  'Who else will visit us from the Cat Planet?': '接下來還會有哪些 Ritty 從貓咪星球來呢？', 'Previous Ritty': '上一位 Ritty', 'Next Ritty': '下一位 Ritty', 'illustration': '插畫', ' illustration': ' 插畫',
  'A new friend is on the way': '新朋友即將到來', 'Look forward to meeting a new friend': '期待和新朋友見面吧', 'Choose a Ritty to meet': '選擇想認識的 Ritty', 'Ritty’s story': 'Ritty 的故事',
  'Appearance coming soon': '角色造型即將公開', 'What will they look like?': '牠會是什麼模樣呢？', 'Resume background motion': '繼續播放背景動畫', 'Pause background motion': '暫停背景動畫', 'Watch gameplay': '觀看遊戲畫面', 'Life with Ritty: Gameplay': '和 Ritty 一起生活：遊戲畫面', 'Chat with Ritty': '和 Ritty 聊聊天', 'Close video': '關閉影片', 'Gameplay video coming soon': '遊戲影片即將公開', 'We’re preparing a gameplay video.': '遊戲影片準備中。', 'A gameplay video will appear here. No video is available yet.': '遊戲影片準備中。', 'Gameplay footage': '遊戲畫面', 'The video is not available yet. Please check back later.': '影片尚未開放，請稍後再回來看看。', 'The video could not be loaded. Please try again later.': '影片載入失敗，請稍後再試。', 'Close news': '關閉消息',
  'SamMeows Inc.': 'SamMeows Inc.', 'Company representatives: Sojeong Choi and Changjun Moon': '公司代表：Sojeong Choi、Changjun Moon', 'Business registration number': '韓國營業登記編號',
}

export const homeChineseTraditional: Record<string, string> = Object.fromEntries(
  Object.entries(homeEnglish).map(([korean, english]) => [korean, chinese[english] || english]),
)
export const translateHomeMarkupChineseTraditional = (markup: string) => {
  return translateMarkupCopy(translateMarkupCopy(markup, homeEnglish), chinese)
}
