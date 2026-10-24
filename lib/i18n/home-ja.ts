import { homeEnglish } from './home-en'
import { translateMarkupCopy } from './translate-markup'

const japanese: Record<string, string> = {
  'One day, a cat<br>fell from the sky!': 'ある日、空から<br>猫が降ってきた！',
  'A cat friend who is always there to listen': 'いつでも話を聞いてくれる、特別な猫の友だち',
  'A cozy life simulation with talking cats': 'おしゃべり猫たちとの癒やしの暮らし',
  'Gray, orange, and calico Ritty cats playing on an island beneath shooting stars': '流れ星の島で遊ぶグレー、オレンジ、三毛のリティたち',
  'Skip to content': '本文へ移動', 'Main navigation': 'メインナビゲーション', 'Pre-register': '事前登録',
  'Official social channels': '公式SNS', 'official channel': '公式チャンネル',
  'What shall we<br><em>do today, Ritty?</em>': '今日はリティと<br><em>何をしよう？</em>',
  'Meet the Ritty cats<br><em>from the Cat Planet!</em>': 'ねこ惑星から来た<br><em>リティたちに会おう！</em>',
  'Ritty, the talking cat': 'おしゃべり猫のリティ', 'What shall we harvest today?': '今日は何を収穫しよう？',
  'Plant seeds, water them and watch your crops grow. Expand your garden to grow even more.': '種をまいて水をあげ、作物を育てましょう。畑を広げれば、もっとたくさん育てられます。',
  'Gray Ritty watching you harvest crops': '収穫を見つめるグレーのリティ', 'What shall I cook for you?': '何を作ってあげようか？',
  'Cook a meal with your harvest and share it with Ritty. What will their favorite food be?': '収穫した食材で料理を作ってリティにあげましょう。どんな料理が好きかな？',
  'Gray Ritty waiting for a meal': '料理を待つグレーのリティ', 'Make a home of your own': '自分だけの家を作ろう',
  'Gather materials, craft furniture and arrange it just the way you like. Expand your home to make room for more.': '素材を集めて家具を作り、好きな場所に飾りましょう。家を広げれば、もっと家具を置けます。',
  'Gray Ritty checking the pieces while you build furniture': '家具作りのそばで部品を眺めるグレーのリティ', 'Go fishing and explore the village': '釣りをして、村へ出かけよう',
  'Cast a line into the sea, then stop by the village shops on your way home.': '海で釣りを楽しんだら、帰りに村のお店にも寄ってみましょう。',
  'Gray Ritty watching a fishing float': '釣りのウキを見つめるグレーのリティ', 'Wow, did you grow this yourself?': 'わあ、これ自分で育てたの？',
  'Just one bite! Can I try it now?': 'ひと口だけ！今食べてもいい？', 'New furniture? Let me see!': '新しい家具？見せて！', 'It just moved! Is that a fish?': '今動いたよ！魚かな？',
  'Previous life scene': '前の暮らしのシーン', 'Next life scene': '次の暮らしのシーン', 'Choose a life scene': '暮らしのシーンを選択',
  'View gardening scene': '畑のシーンを見る', 'View cooking scene': '料理のシーンを見る', 'View home decorating scene': '部屋づくりのシーンを見る', 'View fishing scene': '釣りのシーンを見る', 'Life scene': '暮らしのシーン', 'carousel': 'カルーセル',
  'We’re getting ready<br>to meet you.': 'あなたに会う<br>準備をしています。', 'Coming to iOS and Android.<br>Stay tuned for the release date.': 'iOS・Android向けに配信予定。<br>配信日のお知らせをお待ちください。',
  'All development news and announcements (Korean) →': 'お知らせ・開発便り（韓国語）一覧 →', 'All Ritty news (Korean) →': 'Rittyのお知らせ（韓国語）一覧 →', 'Ritty News': 'Rittyのお知らせ',
  'Privacy Policy': 'プライバシーポリシー', 'Terms of Service': '利用規約', 'About Us': '会社概要', 'Contact Us': 'お問い合わせ',
  'Communications Officer': '通信士', 'Astronomer': '天文学者', 'Repair Shop Owner': '修理店の店主', 'Florist': '花屋さん', 'Former Star Athlete': '元トップアスリート', 'Fashion Designer': 'ファッションデザイナー', 'Lyricist': '作詞家', 'A New Friend': '新しい仲間',
  'A communications officer who once hosted a radio show for faraway explorers, sharing their stories and song requests. Ritty hopes to turn everything they see, taste, and experience on Earth into a broadcast for the Cat Planet.': '遠く離れた探検隊員の便りやリクエスト曲を届けるラジオ番組を担当していた通信士。地球で見たこと、食べたもの、体験したことをねこ惑星へ伝える放送を作りたいと思っています。',
  'Coco grew up stargazing in the countryside and became an astronomer at the capital’s observatory. Coco was the first to discover the glowing blue Earth and came to see the world they had only known through a telescope.': '田舎で星を眺めて育ち、都の天文台で天文学者になったココ。青く輝く地球を初めて見つけ、望遠鏡の向こうにあった世界を訪ねてきました。',
  'Leo is a skilled mechanic who ran a little repair shop on the Cat Planet. Leo doesn’t say much, but can’t walk past something broken—and has a soft spot for sweet desserts.': 'ねこ惑星の小さな修理店を営んでいた腕利きの修理屋さん。口数は少なくても、壊れたものを見過ごせません。甘いデザートが大好き。',
  'They ran a small flower shop because they loved seeing customers’ faces light up when they picked up their flowers. Cheerful and kind, they also have firm principles.': '花を受け取ったお客さんの笑顔が見たくて、小さな花屋さんを営んでいました。明るくて優しいけれど、自分の大切なものはしっかり守ります。',
  'A former star athlete from the Cat Planet. While recovering from an injury, they got hooked on game strategies and chasing high scores. On a whim, they applied to join an expedition—and ended up all the way on Earth.': 'ねこ惑星を代表する元アスリート。けがの療養中にゲームの攻略や記録更新に夢中になり、思い切って応募した探検で地球までやってきました。',
  'They love beautiful clothes and compliments. Usually playful and affectionate, they become completely serious when talking about design. They haven’t been able to make clothes on Earth yet.': 'きれいな服と褒められることが大好きなデザイナー。普段は甘えん坊でも、デザインの話になると真剣そのもの。地球ではまだ服を作れていません。',
  'A lyricist who finds inspiration in everyday conversations and little moments. They remember your favorite foods and love listening to music together. Behind those gentle words are distinct tastes and a stubborn streak.': '何気ない会話や日常の中から歌詞を見つける作詞家。好きな食べ物を覚えてくれて、一緒に音楽を聴くのが大好き。優しい言葉の奥に、自分だけの好みとこだわりがあります。',
  'Coco': 'ココ', 'Leo': 'レオ', 'Ritty': 'リティ', 'Home': 'ホーム', 'Life': '暮らし', 'News': 'お知らせ',
  'Singing · Dancing · Fish': '歌・ダンス・魚', 'Stargazing · Reading · Vegetables': '星空・読書・野菜', 'Desserts · Walks': 'スイーツ・散歩', 'Naps · Flowers · Fish': 'お昼寝・花・魚', 'Ball sports · Gaming · Meat': '球技・ゲーム・お肉', 'Fashion · Grooming': 'ファッション・おしゃれ', 'Cooking · Music · Movies': '料理・音楽・映画', 'Likes: ': '好きなもの： ',
  'This is Earth. Can you hear me?': 'こちら地球、聞こえますか？', 'Out on a repair call. Return date unknown.': '出張修理中。戻る日は未定。',
  'SamMeows Inc.': 'SamMeows Inc.', 'Company representatives: Sojeong Choi and Changjun Moon': '代表者：チェ・ソジョン、ムン・チャンジュン', 'Business registration number': '事業者登録番号',
  'Who else will visit us from the Cat Planet?': 'ねこ惑星から、次はどんなリティがやってくるかな？', 'Previous Ritty': '前のリティ', 'Next Ritty': '次のリティ', 'illustration': 'イラスト', ' illustration': ' イラスト',
  'A gameplay video will appear here. No video is available yet.': 'ゲームプレイ動画を準備中です。', 'The video is not available yet. Please check back later.': '動画はまだご覧いただけません。しばらくしてからもう一度お試しください。', 'The video could not be loaded. Please try again later.': '動画を読み込めませんでした。しばらくしてからもう一度お試しください。',
  'A new friend is on the way': '新しい仲間がやってきます', 'Look forward to meeting a new friend': '新しい出会いをお楽しみに', 'Choose a Ritty to meet': '会いたいリティを選ぶ', 'Ritty’s story': 'リティの物語',
  'Appearance coming soon': '姿は近日公開', 'What will they look like?': 'どんな姿かな？', 'Resume background motion': '背景の動きを再開', 'Pause background motion': '背景の動きを停止', 'Watch gameplay': 'ゲームプレイを見る', 'Life with Ritty: Gameplay': 'リティとの暮らし：ゲームプレイ', 'Chat with Ritty': 'リティとおしゃべり', 'Close video': '動画を閉じる', 'Gameplay video coming soon': 'ゲームプレイ動画は近日公開', 'We’re preparing a gameplay video.': 'ゲームプレイ動画を準備中です。', 'Gameplay footage': 'ゲームプレイ映像', 'Close news': 'お知らせを閉じる',
}

export const homeJapanese: Record<string, string> = Object.fromEntries(
  Object.entries(homeEnglish).map(([korean, english]) => [korean, japanese[english] || english]),
)
export const translateHomeMarkupJapanese = (markup: string) => {
  return translateMarkupCopy(translateMarkupCopy(markup, homeEnglish), japanese)
}
