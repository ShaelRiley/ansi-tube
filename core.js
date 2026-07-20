(function exposeAnsiTubeCore(root, factory) {
  const api = factory();
  root.AnsiTubeCore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function makeAnsiTubeCore() {
  "use strict";

  const GLYPHS = [" ", "░", "▒", "▓", "█", "▄", "▌", "▐", "▀"];
  const GLYPH = Object.freeze({ SPACE: 0, LIGHT: 1, MEDIUM: 2, DARK: 3, FULL: 4, LOWER: 5, LEFT: 6, RIGHT: 7, UPPER: 8 });
  const CELL_WIDTH = 8;
  const CELL_HEIGHT = 16;

  const RESTRICTED_ASCII = Array.from(" .',:`^-~_;!i1|/\\()[]{}<>+*?ltfrxvczXYUJCL0OQZmwqpdbkhaoenuy253769SAGHEMKW#%8B&@$");
  const PRINTABLE_ASCII = Array.from({ length: 95 }, (_, index) => String.fromCharCode(index + 32));
  const CP437_EXTENDED = Array.from("☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■");

  function estimatedDensity(character) {
    if (character === " ") return 0;
    if (".'`,:·∙".includes(character)) return 0.12;
    if ('-_^~"'.includes(character)) return 0.20;
    if ("/\\|!iIl()[]{}<>".includes(character)) return 0.30;
    if ("░".includes(character)) return 0.25;
    if ("▒".includes(character)) return 0.50;
    if ("▓".includes(character)) return 0.75;
    if ("▀▄▌▐".includes(character)) return 0.52;
    if ("█■@#%&$MWB8".includes(character)) return 0.95;
    if ("┼╬╫╪═║".includes(character)) return 0.68;
    if ("─│┤├┬┴┌┐└┘".includes(character)) return 0.42;
    if (/[A-Z0-9]/.test(character)) return 0.68;
    if (/[a-z]/.test(character)) return 0.52;
    return 0.58;
  }

  const FULL_ASCII = [...PRINTABLE_ASCII].sort((a, b) => estimatedDensity(a) - estimatedDensity(b));
  const FULL_ANSI = [...new Set([...GLYPHS, ...PRINTABLE_ASCII, ...CP437_EXTENDED])]
    .sort((a, b) => estimatedDensity(a) - estimatedDensity(b));

  const RESTRICTED_EMOJI = [
    ["⚫", 18, 18, 18], ["⚪", 238, 238, 238], ["🟥", 220, 45, 55], ["🟧", 238, 122, 32],
    ["🟨", 240, 210, 40], ["🟩", 48, 175, 78], ["🟦", 52, 108, 210], ["🟪", 142, 65, 180],
    ["🟫", 115, 73, 48], ["🔴", 226, 54, 62], ["🟠", 242, 133, 42], ["🟡", 245, 215, 52],
    ["🟢", 57, 181, 84], ["🔵", 55, 113, 218], ["🟣", 147, 68, 190], ["💗", 244, 104, 164]
  ];

  const FULL_EMOJI = [
    ...RESTRICTED_EMOJI,
    ["❤️", 210, 30, 45], ["🧡", 236, 108, 30], ["💛", 242, 205, 42], ["💚", 45, 170, 70],
    ["💙", 48, 105, 205], ["💜", 135, 55, 175], ["🖤", 20, 20, 24], ["🤍", 238, 238, 234],
    ["🍎", 205, 40, 45], ["🍊", 238, 123, 28], ["🍋", 240, 214, 50], ["🍏", 90, 185, 70],
    ["🫐", 55, 65, 145], ["🍇", 125, 55, 145], ["🍓", 220, 48, 65], ["🥝", 105, 145, 55],
    ["🌹", 196, 35, 55], ["🌻", 235, 190, 40], ["🌲", 40, 115, 60], ["🌊", 40, 120, 195],
    ["🔥", 239, 95, 28], ["✨", 245, 213, 110], ["🌙", 224, 214, 146], ["☀️", 244, 190, 44],
    ["🌈", 170, 115, 125], ["❄️", 195, 225, 238], ["☁️", 205, 210, 220], ["🌑", 26, 28, 38],
    ["😀", 238, 190, 70], ["😈", 126, 69, 170], ["👽", 110, 185, 110], ["👻", 225, 225, 230],
    ["🤖", 140, 155, 165], ["💀", 205, 205, 190], ["👾", 110, 60, 165], ["🧠", 210, 120, 140],
    ["🐸", 78, 165, 77], ["🐳", 70, 145, 205], ["🦊", 215, 104, 40], ["🐻", 125, 83, 52],
    ["🦄", 205, 135, 205], ["🦋", 70, 130, 200], ["🐞", 195, 35, 40], ["🐝", 220, 180, 45],
    ["🎃", 226, 105, 28], ["🎄", 42, 122, 62], ["🎈", 215, 45, 55], ["🎁", 190, 52, 70],
    ["💎", 85, 190, 220], ["🔮", 112, 63, 170], ["🧿", 45, 100, 190], ["🪙", 210, 166, 55],
    ["⚙️", 145, 150, 155], ["💡", 240, 205, 76], ["📺", 75, 85, 105], ["💾", 65, 92, 145],
    ["🚗", 190, 45, 52], ["🚕", 230, 185, 38], ["🚙", 55, 132, 175], ["🚀", 175, 180, 188],
    ["🛸", 105, 145, 145], ["🏠", 165, 88, 65], ["🏝️", 80, 155, 155], ["🌋", 150, 65, 42]
  ];

  const BINARY = ["0", "1"];
  const WINGDINGS = Array.from(" ·∙•◦○◌☾☽☼☆✧◇□△▽✏✂☎✉☞☜☝☟☺☹☁☂❄✈⚑☯✞✡☮☠♠♥♦♣★✦◆■●✹✓✔✕✖➜➤←↑→↓↔↕");
  const CHINESE = Array.from(" ·一丨丶丿乙亅二亠人儿入八冂冖冫几凵刀力勹匕匚十卜卩厂厶又口囗土士夂夕大女子宀寸小尢尸山巛工己巾干幺广廴廾弋弓彐彡彳心戈戶手支攴文斗斤方无日曰月木欠止歹殳毋比毛氏气水火爪父爻爿片牙牛犬玄玉瓜瓦甘生用田疋疒癶白皮皿目矛矢石示禸禾穴立竹米糸缶网羊羽老而耒耳聿肉臣自至臼舌舟艮色艸虍虫血行衣襾見角言谷豆豕豸貝赤走足身車辛辰辵邑酉釆里金長門阜隶隹雨青非面革韋韭音頁風飛食首香馬骨高髟鬥鬯鬲鬼魚鳥鹵鹿麥麻黃黍黑黹黽鼎鼓鼠鼻齊齒龍龜龠");
  const JAPANESE = Array.from(" ·。、ー・ぁあぃいぅうぇえぉおかがきぎくぐけげこござさしじすずせぜそぞただちぢっつづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもゃやゅゆょよらりるれろゎわをんァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロヮワヲンヴヵヶ日月火水木金土山川田人大小中上下左右本年時分半白黒赤青円口目耳手足花空雨海風雪星光夢愛心猫犬鳥魚龍鬼神侍忍桜");
  const KOREAN = Array.from(" ·ㆍㅡㅣㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ가각간갇갈감갑값갓강개객거걱건걸검겁것게겨격견결겸경고곡곤골곰곳공과관광괴교구국군굴궁권귀규그극근글금급기긴길김깊나난날남내너널네녀년노눈늘다단달담대더도독돌동되두들등라락란람랑래러레려로록론루류를리린마막만말맘맛망매머메며명모목몸무문물미민바박반발밤방배버별보복볼봄부불비빛사산살삼상새서석선설섬성세소속손솔송수숙순술숨숲스슬습시식신실심십아악안알암앙애어언얼엄업없에여역연열영오옥온올옷와완왕외요용우욱운울움웃워원위유육율은을음의이익인일임입자작잔잘잠장재저적전절점정제조족존좋주죽준줄중지직진질집차찬찰참창채처천철청초촌추축춘출충치친칠침카칼코쿠크타탁탄탈탐탑태터토통투트파판팔패퍼포표푸프피하학한할함합항해허현혈형호혹혼홀홍화환활황회효후훈훌흐희히한글대한민국서울사랑하늘바다별빛꿈");
  const MOSAIC = Array.from(" ▁▔▖▗▘▝░▂▌▐▀▄▚▞▃▒▙▛▜▟▅▓▆▇█");
  const BRAILLE = Array.from({ length: 256 }, (_, index) => String.fromCodePoint(0x2800 + index))
    .sort((a, b) => {
      const count = (character) => {
        let value = character.codePointAt(0) - 0x2800;
        let bits = 0;
        while (value) { bits += value & 1; value >>= 1; }
        return bits;
      };
      return count(a) - count(b);
    });

  // Original 8x16 video alphabet. Each byte is one bitmap row, MSB on the left.
  // The shapes are deliberately non-typographic: occupancy, contours, junctions,
  // curves, compact facial cues, and four temporally-gated textures.
  const VIDEO_GLYPH_NAMES = [
    "Void", "Center Pin", "Vertical Seed", "Horizontal Seed", "Small Disk", "Ring", "Mid Disk", "Full Block",
    "Upper Half", "Lower Half", "Left Half", "Right Half", "Upper-Left Quarter", "Upper-Right Quarter", "Lower-Left Quarter", "Lower-Right Quarter",
    "Center Pillar", "Center Slab", "Top Band", "Bottom Band", "Vertical Thin", "Vertical Heavy", "Horizontal Thin", "Horizontal Heavy",
    "Rising Diagonal Thin", "Rising Diagonal Heavy", "Falling Diagonal Thin", "Falling Diagonal Heavy", "Left Edge", "Right Edge", "Top Edge", "Bottom Edge",
    "Terminal Left", "Terminal Right", "Terminal Up", "Terminal Down", "Corner Upper Left", "Corner Upper Right", "Corner Lower Left", "Corner Lower Right",
    "Tee Up", "Tee Down", "Tee Left", "Tee Right", "Cross", "Diagonal Cross", "Fork Up", "Fork Down",
    "Top Arc", "Bottom Arc", "Left Arc", "Right Arc", "Smile", "Frown", "Eye Pair", "Brow Pair",
    "Nose Mark", "Mouth Bar", "Head Dot", "Bust Silhouette", "Sparse Checker", "Dense Checker", "Vertical Hatch", "Horizontal Hatch"
  ];

  const VIDEO_GLYPH_MASKS = [
    [0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00],
    [0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x18,0x18,0x00,0x00,0x00,0x00,0x00,0x00,0x00],
    [0x00,0x00,0x00,0x00,0x00,0x18,0x18,0x18,0x18,0x18,0x18,0x00,0x00,0x00,0x00,0x00],
    [0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x3c,0x3c,0x00,0x00,0x00,0x00,0x00,0x00,0x00],
    [0x00,0x00,0x00,0x00,0x00,0x3c,0x3c,0x3c,0x3c,0x3c,0x3c,0x00,0x00,0x00,0x00,0x00],
    [0x00,0x00,0x00,0x3c,0x3c,0x66,0x42,0x42,0x42,0x42,0x66,0x3c,0x3c,0x00,0x00,0x00],
    [0x00,0x00,0x00,0x18,0x3c,0x3c,0x7e,0x7e,0x7e,0x7e,0x3c,0x3c,0x18,0x00,0x00,0x00],
    [0xff,0xff,0xff,0xff,0xff,0xff,0xff,0xff,0xff,0xff,0xff,0xff,0xff,0xff,0xff,0xff],
    [0xff,0xff,0xff,0xff,0xff,0xff,0xff,0xff,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00],
    [0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0xff,0xff,0xff,0xff,0xff,0xff,0xff,0xff],
    [0xf0,0xf0,0xf0,0xf0,0xf0,0xf0,0xf0,0xf0,0xf0,0xf0,0xf0,0xf0,0xf0,0xf0,0xf0,0xf0],
    [0x0f,0x0f,0x0f,0x0f,0x0f,0x0f,0x0f,0x0f,0x0f,0x0f,0x0f,0x0f,0x0f,0x0f,0x0f,0x0f],
    [0xf0,0xf0,0xf0,0xf0,0xf0,0xf0,0xf0,0xf0,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00],
    [0x0f,0x0f,0x0f,0x0f,0x0f,0x0f,0x0f,0x0f,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00],
    [0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0xf0,0xf0,0xf0,0xf0,0xf0,0xf0,0xf0,0xf0],
    [0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x0f,0x0f,0x0f,0x0f,0x0f,0x0f,0x0f,0x0f],
    [0x7e,0x7e,0x7e,0x7e,0x7e,0x7e,0x7e,0x7e,0x7e,0x7e,0x7e,0x7e,0x7e,0x7e,0x7e,0x7e],
    [0x00,0x00,0x00,0x00,0x00,0xff,0xff,0xff,0xff,0xff,0xff,0x00,0x00,0x00,0x00,0x00],
    [0xff,0xff,0xff,0xff,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00],
    [0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0xff,0xff,0xff,0xff],
    [0x18,0x18,0x18,0x18,0x18,0x18,0x18,0x18,0x18,0x18,0x18,0x18,0x18,0x18,0x18,0x18],
    [0x3c,0x3c,0x3c,0x3c,0x3c,0x3c,0x3c,0x3c,0x3c,0x3c,0x3c,0x3c,0x3c,0x3c,0x3c,0x3c],
    [0x00,0x00,0x00,0x00,0x00,0x00,0x00,0xff,0xff,0x00,0x00,0x00,0x00,0x00,0x00,0x00],
    [0x00,0x00,0x00,0x00,0x00,0x00,0xff,0xff,0xff,0xff,0x00,0x00,0x00,0x00,0x00,0x00],
    [0x01,0x03,0x03,0x06,0x06,0x0c,0x0c,0x18,0x18,0x30,0x30,0x60,0x60,0xc0,0xc0,0x80],
    [0x03,0x03,0x07,0x07,0x0e,0x0e,0x1c,0x1c,0x38,0x38,0x70,0x70,0xe0,0xe0,0xc0,0xc0],
    [0x80,0xc0,0xc0,0x60,0x60,0x30,0x30,0x18,0x18,0x0c,0x0c,0x06,0x06,0x03,0x03,0x01],
    [0xc0,0xc0,0xe0,0xe0,0x70,0x70,0x38,0x38,0x1c,0x1c,0x0e,0x0e,0x07,0x07,0x03,0x03],
    [0xc0,0xc0,0xc0,0xc0,0xc0,0xc0,0xc0,0xc0,0xc0,0xc0,0xc0,0xc0,0xc0,0xc0,0xc0,0xc0],
    [0x03,0x03,0x03,0x03,0x03,0x03,0x03,0x03,0x03,0x03,0x03,0x03,0x03,0x03,0x03,0x03],
    [0xff,0xff,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00],
    [0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0xff,0xff],
    [0x00,0x00,0x00,0x00,0x00,0x00,0x00,0xf8,0xf8,0x00,0x00,0x00,0x00,0x00,0x00,0x00],
    [0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x1f,0x1f,0x00,0x00,0x00,0x00,0x00,0x00,0x00],
    [0x18,0x18,0x18,0x18,0x18,0x18,0x18,0x18,0x18,0x00,0x00,0x00,0x00,0x00,0x00,0x00],
    [0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x18,0x18,0x18,0x18,0x18,0x18,0x18,0x18,0x18],
    [0xff,0xff,0xc0,0xc0,0xc0,0xc0,0xc0,0xc0,0xc0,0xc0,0xc0,0xc0,0xc0,0xc0,0xc0,0xc0],
    [0xff,0xff,0x03,0x03,0x03,0x03,0x03,0x03,0x03,0x03,0x03,0x03,0x03,0x03,0x03,0x03],
    [0xc0,0xc0,0xc0,0xc0,0xc0,0xc0,0xc0,0xc0,0xc0,0xc0,0xc0,0xc0,0xc0,0xc0,0xff,0xff],
    [0x03,0x03,0x03,0x03,0x03,0x03,0x03,0x03,0x03,0x03,0x03,0x03,0x03,0x03,0xff,0xff],
    [0xff,0xff,0x18,0x18,0x18,0x18,0x18,0x18,0x18,0x18,0x18,0x18,0x18,0x18,0x18,0x18],
    [0x18,0x18,0x18,0x18,0x18,0x18,0x18,0x18,0x18,0x18,0x18,0x18,0x18,0x18,0xff,0xff],
    [0xc0,0xc0,0xc0,0xc0,0xc0,0xc0,0xc0,0xff,0xff,0xc0,0xc0,0xc0,0xc0,0xc0,0xc0,0xc0],
    [0x03,0x03,0x03,0x03,0x03,0x03,0x03,0xff,0xff,0x03,0x03,0x03,0x03,0x03,0x03,0x03],
    [0x18,0x18,0x18,0x18,0x18,0x18,0x18,0xff,0xff,0x18,0x18,0x18,0x18,0x18,0x18,0x18],
    [0x81,0xc3,0xc3,0x66,0x66,0x3c,0x3c,0x18,0x18,0x3c,0x3c,0x66,0x66,0xc3,0xc3,0x81],
    [0x00,0x81,0xc3,0x42,0x66,0x66,0x3c,0x3c,0x18,0x18,0x18,0x18,0x18,0x18,0x18,0x18],
    [0x18,0x18,0x18,0x18,0x18,0x18,0x18,0x18,0x3c,0x3c,0x66,0x66,0x42,0xc3,0x81,0x00],
    [0x00,0x18,0x3c,0x7e,0x66,0xc3,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00],
    [0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0xc3,0x66,0x7e,0x3c,0x18,0x00],
    [0x00,0x00,0x20,0x60,0x40,0x40,0xc0,0xc0,0xc0,0xc0,0x40,0x40,0x60,0x20,0x00,0x00],
    [0x00,0x00,0x04,0x06,0x02,0x02,0x03,0x03,0x03,0x03,0x02,0x02,0x06,0x04,0x00,0x00],
    [0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x24,0x7e,0x3c,0x00,0x00,0x00],
    [0x00,0x00,0x00,0x3c,0x7e,0x24,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00],
    [0x00,0x00,0x00,0x00,0x00,0x00,0x66,0x66,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00],
    [0x00,0x00,0x00,0x00,0x66,0x24,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00],
    [0x00,0x00,0x00,0x00,0x00,0x18,0x18,0x18,0x18,0x18,0x38,0x00,0x00,0x00,0x00,0x00],
    [0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x7e,0x7e,0x00,0x00,0x00,0x00],
    [0x00,0x00,0x18,0x3c,0x3c,0x3c,0x3c,0x18,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00],
    [0x00,0x00,0x18,0x3c,0x3c,0x3c,0x18,0x00,0x3c,0x7e,0xff,0xff,0x7e,0x00,0x00,0x00],
    [0x88,0x00,0x22,0x00,0x88,0x00,0x22,0x00,0x88,0x00,0x22,0x00,0x88,0x00,0x22,0x00],
    [0xaa,0x55,0xaa,0x55,0xaa,0x55,0xaa,0x55,0xaa,0x55,0xaa,0x55,0xaa,0x55,0xaa,0x55],
    [0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55,0x55],
    [0x00,0xff,0x00,0x00,0xff,0x00,0x00,0xff,0x00,0x00,0xff,0x00,0x00,0xff,0x00,0x00]
  ];

  const GLYPH_SETS = {
    restrictAnsi: { glyphs: GLYPHS, type: "ansi" },
    fullAnsi: { glyphs: FULL_ANSI, type: "ansi" },
    restrictedAscii: { glyphs: RESTRICTED_ASCII, type: "ascii" },
    fullAscii: { glyphs: FULL_ASCII, type: "ascii" },
    binary: { glyphs: BINARY, type: "binary" },
    wingdings: { glyphs: WINGDINGS, type: "wingdings" },
    chinese: { glyphs: CHINESE, type: "text" },
    japanese: { glyphs: JAPANESE, type: "text" },
    korean: { glyphs: KOREAN, type: "text" },
    braille: { glyphs: BRAILLE, type: "text" },
    mosaic: { glyphs: MOSAIC, type: "mosaic" },
    video64: { glyphs: VIDEO_GLYPH_NAMES, masks: VIDEO_GLYPH_MASKS, type: "bitmap" },
    vectorLines: { glyphs: [""], type: "vector" },
    restrictedEmoji: { glyphs: RESTRICTED_EMOJI.map((entry) => entry[0]), colors: RESTRICTED_EMOJI, type: "emoji", nativeColor: true },
    fullEmoji: { glyphs: FULL_EMOJI.map((entry) => entry[0]), colors: FULL_EMOJI, type: "emoji", nativeColor: true }
  };

  const ANSI_16 = [
    [0, 0, 0], [170, 0, 0], [0, 170, 0], [170, 85, 0],
    [0, 0, 170], [170, 0, 170], [0, 170, 170], [170, 170, 170],
    [85, 85, 85], [255, 85, 85], [85, 255, 85], [255, 255, 85],
    [85, 85, 255], [255, 85, 255], [85, 255, 255], [255, 255, 255]
  ];

  const ANSI_32 = [
    ...ANSI_16,
    [24, 24, 24], [68, 68, 68], [118, 118, 118], [218, 218, 218],
    [128, 32, 32], [220, 64, 64], [128, 96, 24], [238, 164, 48],
    [32, 112, 56], [40, 210, 92], [24, 96, 128], [44, 190, 224],
    [44, 56, 150], [84, 106, 235], [116, 38, 142], [224, 74, 210]
  ];

  const EGA_64 = [];
  for (const r of [0, 85, 170, 255]) {
    for (const g of [0, 85, 170, 255]) {
      for (const b of [0, 85, 170, 255]) EGA_64.push([r, g, b]);
    }
  }

  function paletteFromHex(values) {
    return values.map((hex) => {
      const value = Number.parseInt(hex.replace("#", ""), 16);
      return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
    });
  }

  const FIXED_PALETTES = {
    nes: paletteFromHex(["#000000", "#fcfcfc", "#f8b800", "#f87800", "#d82800", "#a80020", "#a81000", "#503000", "#007800", "#00a800", "#00b800", "#00a8a8", "#008088", "#0058f8", "#3cbcfc", "#6844fc", "#9878f8", "#d800cc", "#f878f8", "#f8a4c0", "#b8b8b8", "#7c7c7c"]),
    sms: paletteFromHex(["#000000", "#555555", "#aaaaaa", "#ffffff", "#aa0000", "#ff5555", "#ffaa00", "#ffff55", "#00aa00", "#55ff55", "#00aaaa", "#55ffff", "#0000aa", "#5555ff", "#aa00aa", "#ff55ff"]),
    genesis: paletteFromHex(["#000000", "#202020", "#404040", "#6c6c6c", "#909090", "#b4b4b4", "#d8d8d8", "#ffffff", "#fc0000", "#fc9000", "#fcdc00", "#00d800", "#00fc90", "#00d8fc", "#006cfc", "#9000fc", "#fc00d8", "#fc90b4", "#6c4824", "#b46c24", "#246c24", "#24486c"]),
    c64: paletteFromHex(["#000000", "#ffffff", "#813338", "#75cec8", "#8e3c97", "#56ac4d", "#2e2c9b", "#edf171", "#8e5029", "#553800", "#c46c71", "#4a4a4a", "#7b7b7b", "#a9ff9f", "#706deb", "#b2b2b2"]),
    apple2e: paletteFromHex(["#000000", "#ffffff", "#722640", "#e04f60", "#40337f", "#e434fe", "#1b6d85", "#73fdff", "#805d28", "#f2b233", "#5cba3c", "#d5f59e", "#236dce", "#72a7ff", "#c8c8c8", "#7d7d7d"]),
    virtualb: paletteFromHex(["#000000", "#360000", "#8c0000", "#ff0018"]),
    gbdmg: paletteFromHex(["#0f380f", "#306230", "#8bac0f", "#9bbc0f"]),
    apple2green: paletteFromHex(["#000000", "#003b12", "#00a83a", "#62ff88", "#d6ffe0"]),
    snes: paletteFromHex(["#000000", "#ffffff", "#f8d878", "#f08070", "#d05078", "#7050a0", "#3840a8", "#4888d8", "#60c0d0", "#58b070", "#80c858", "#d0d850", "#e89848", "#a85838", "#704038", "#b8a090", "#786878", "#484050"]),
    vexitrexi: paletteFromHex(["#000000", "#193019", "#4f7f4f", "#9fd49f", "#e6ffe6"]),
    zedexspectral: paletteFromHex(["#000000", "#0000d7", "#d70000", "#d700d7", "#00d700", "#00d7d7", "#d7d700", "#d7d7d7", "#0000ff", "#ff0000", "#ff00ff", "#00ff00", "#00ffff", "#ffff00", "#ffffff"]),
    atari2600: paletteFromHex(["#000000", "#404040", "#6c6c6c", "#909090", "#b0b0b0", "#ececec", "#444400", "#646410", "#848424", "#a0a034", "#b8b840", "#d0d050", "#702800", "#844414", "#985c28", "#ac783c", "#bc8c4c", "#cca05c", "#841800", "#983418", "#ac5030", "#c06848", "#d0805c", "#e09470", "#78005c", "#8c2074", "#a03c88", "#b0589c", "#c070b0", "#d084c0", "#002c70", "#164484", "#2c5c98", "#4074ac", "#5488bc", "#689cc8", "#005c5c", "#147474", "#288c8c", "#3ca0a0", "#50b4b4", "#64c8c8", "#006414", "#187c2c", "#309444", "#48ac5c", "#60c474", "#74dc88"]),
    atari5200: paletteFromHex(["#000000", "#f0f0f0", "#7c7c7c", "#f04444", "#c02020", "#f08030", "#e0c040", "#90c040", "#30a050", "#20b0a0", "#3090d0", "#4050d0", "#8030c0", "#c030a0", "#804020", "#d0a070"]),
    trash80: paletteFromHex(["#000000", "#173817", "#42a342", "#8cff8c", "#d8ffd8"]),
    oldtv: paletteFromHex(["#050805", "#263026", "#536253", "#8d9a88", "#c8cfbd", "#f2ead0"]),
    eighties: paletteFromHex(["#080018", "#28105c", "#7b2cbf", "#ff2aa1", "#ff6b35", "#ffd166", "#00f5d4", "#00bbf9", "#f8f9fa"]),
    sunburst: paletteFromHex(["#090000", "#4a0000", "#9f1800", "#e54b00", "#ff8c00", "#ffd000", "#fff3a0", "#ffffff"]),
    moonburst: paletteFromHex(["#03050d", "#0b1638", "#25246a", "#554d9c", "#9296c9", "#d7d8e8", "#fff4cf", "#ffffff"]),
    mooburst: paletteFromHex(["#050505", "#1b1712", "#3b261c", "#6b4127", "#34723e", "#b9802f", "#e5a75b", "#f0aebc", "#f5e8cf", "#ffffff"]),
    ruby: paletteFromHex(["#080005", "#320014", "#670022", "#a50735", "#db2348", "#ff5a70", "#ffadb6", "#fff4f3"]),
    enchantedforest: paletteFromHex(["#020806", "#082619", "#0d4b2b", "#147345", "#239a64", "#57c98b", "#a9edbd", "#efffe8"]),
    nightburst: paletteFromHex(["#01020b", "#050b28", "#0d1d55", "#183d82", "#2769ad", "#559bd2", "#a7cce9", "#edf7ff"]),
    snowburst: paletteFromHex(["#071018", "#163247", "#2d5f78", "#5a91a8", "#91bfd0", "#c6e1e9", "#edf8fb", "#ffffff"]),
    cyberburst: paletteFromHex(["#08000f", "#260046", "#620078", "#b00083", "#ef167f", "#ff5964", "#00e5d2", "#eaffff"]),
    grapeburst: paletteFromHex(["#09000f", "#27003d", "#520069", "#7e168e", "#a941ad", "#d176cc", "#edb8e7", "#fff1ff"]),
    candyburst: paletteFromHex(["#160713", "#4f1742", "#8f326b", "#d15188", "#ff7da0", "#ffa9bd", "#ffd2dc", "#fff7f4"]),
    chromaburst: paletteFromHex(["#050008", "#230071", "#7a008f", "#d00073", "#f43b37", "#ff9b18", "#d9ef32", "#b9ffff"]),
    soulburst: paletteFromHex(["#07030c", "#25123b", "#50245e", "#81396f", "#bd566f", "#e88968", "#f4c982", "#fff8dc"]),
    space: paletteFromHex(["#000006", "#080020", "#13004c", "#281080", "#4c2aa8", "#1b4fd8", "#138fc9", "#a75ee8", "#f0d8ff", "#ffffff"]),
    psychedelic: paletteFromHex(["#120018", "#ff007f", "#ff3d00", "#ffe600", "#40ff00", "#00ffd5", "#006eff", "#8a00ff", "#ffffff"]),
    caveman: paletteFromHex(["#080604", "#2b2117", "#513820", "#76512d", "#9a6a3a", "#b88a58", "#6a5d34", "#394324", "#b54e2b", "#d2b48c"]),
    oceania: paletteFromHex(["#001018", "#002f4b", "#005b73", "#008c95", "#00b9a8", "#42d6bd", "#2b8bc6", "#70c8e8", "#d2fff4"]),
    metallics: paletteFromHex(["#08090b", "#292c31", "#51565e", "#7f8790", "#b0b7be", "#e2e5e8", "#5c3b28", "#a46c42", "#d4a76a", "#8d939d"]),
    silvergold: paletteFromHex(["#080808", "#34363a", "#777d84", "#c5c9cf", "#f4f5f6", "#3b2a08", "#7d5711", "#bd8f27", "#e1bd57", "#fff0a3"]),
    supercomic: paletteFromHex(["#000000", "#ffffff", "#f5222d", "#ff8b00", "#ffe600", "#24c55a", "#00a7e8", "#2455ff", "#8b2cff", "#ff32a6"]),
    hyperreal: paletteFromHex(["#000000", "#ffffff", "#ff1f2d", "#ff7a00", "#ffe100", "#17d45b", "#00d6d9", "#1677ff", "#7a2cff", "#ff21a8", "#7b4b2a", "#f0c8a0"])
  };

  const PALETTE_DEPTHS = [2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128, 256];
  const paletteCache = new Map();

  const BAYER_4X4 = [
    0, 8, 2, 10,
    12, 4, 14, 6,
    3, 11, 1, 9,
    15, 7, 13, 5
  ];

  const DISPERSED_4X4 = [
    0, 11, 4, 15,
    8, 3, 12, 7,
    2, 13, 6, 9,
    14, 5, 10, 1
  ];

  const POPCOUNT_8 = new Uint8Array(256);
  for (let value = 1; value < POPCOUNT_8.length; value += 1) {
    POPCOUNT_8[value] = POPCOUNT_8[value >> 1] + (value & 1);
  }

  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  function popcount32(value) {
    const unsigned = value >>> 0;
    return POPCOUNT_8[unsigned & 255] + POPCOUNT_8[unsigned >>> 8 & 255] +
      POPCOUNT_8[unsigned >>> 16 & 255] + POPCOUNT_8[unsigned >>> 24 & 255];
  }

  function orientationHistogram(values, histogram = new Float32Array(4)) {
    histogram.fill(0);
    let total = 0;
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 4; x += 1) {
        const left = values[y * 4 + Math.max(0, x - 1)];
        const right = values[y * 4 + Math.min(3, x + 1)];
        const top = values[Math.max(0, y - 1) * 4 + x];
        const bottom = values[Math.min(7, y + 1) * 4 + x];
        const gx = right - left;
        const gy = bottom - top;
        const magnitude = Math.hypot(gx, gy);
        if (magnitude < 0.01) continue;
        let angle = Math.atan2(gy, gx);
        if (angle < 0) angle += Math.PI;
        if (angle >= Math.PI) angle -= Math.PI;
        histogram[Math.round(angle / (Math.PI / 4)) & 3] += magnitude;
        total += magnitude;
      }
    }
    if (total > 0) for (let index = 0; index < 4; index += 1) histogram[index] /= total;
    return histogram;
  }

  function buildVideoGlyphFeature(mask) {
    const coverage = new Float32Array(32);
    const occupancy = new Float32Array(8);
    let binaryMask = 0;
    let filled = 0;
    let weightedX = 0;
    let weightedY = 0;
    for (let y = 0; y < CELL_HEIGHT; y += 1) {
      const row = mask[y];
      for (let x = 0; x < CELL_WIDTH; x += 1) {
        if (!(row & (0x80 >> x))) continue;
        filled += 1;
        weightedX += x;
        weightedY += y;
      }
    }
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 4; x += 1) {
        let count = 0;
        for (let oy = 0; oy < 2; oy += 1) {
          const row = mask[y * 2 + oy];
          for (let ox = 0; ox < 2; ox += 1) count += Boolean(row & (0x80 >> (x * 2 + ox)));
        }
        const index = y * 4 + x;
        coverage[index] = count / 4;
        if (count > 0) binaryMask = (binaryMask | (1 << index)) >>> 0;
        occupancy[(y >> 1) * 2 + (x >> 1)] += coverage[index] * 0.25;
      }
    }
    return {
      coverage,
      binaryMask,
      area: filled / (CELL_WIDTH * CELL_HEIGHT),
      centroidX: filled ? weightedX / filled / (CELL_WIDTH - 1) : 0.5,
      centroidY: filled ? weightedY / filled / (CELL_HEIGHT - 1) : 0.5,
      occupancy,
      orientation: orientationHistogram(coverage)
    };
  }

  const VIDEO_GLYPH_FEATURES = VIDEO_GLYPH_MASKS.map(buildVideoGlyphFeature);

  function fillTargetFeatures(mask, target) {
    const values = target.values;
    const occupancy = target.occupancy;
    values.fill(0);
    occupancy.fill(0);
    let count = 0;
    let weightedX = 0;
    let weightedY = 0;
    for (let index = 0; index < 32; index += 1) {
      const lit = (mask >>> index) & 1;
      values[index] = lit;
      if (!lit) continue;
      const x = index & 3;
      const y = index >> 2;
      count += 1;
      weightedX += x;
      weightedY += y;
      occupancy[(y >> 1) * 2 + (x >> 1)] += 0.25;
    }
    target.mask = mask >>> 0;
    target.area = count / 32;
    target.centroidX = count ? weightedX / count / 3 : 0.5;
    target.centroidY = count ? weightedY / count / 7 : 0.5;
    orientationHistogram(values, target.orientation);
    return target;
  }

  function createTargetFeatures() {
    return { mask: 0, area: 0, centroidX: 0.5, centroidY: 0.5, values: new Float32Array(32), occupancy: new Float32Array(8), orientation: new Float32Array(4) };
  }

  function scoreVideoGlyph(target, glyphIndex) {
    const glyph = VIDEO_GLYPH_FEATURES[glyphIndex];
    let occupancyError = 0;
    let orientationError = 0;
    for (let index = 0; index < 8; index += 1) occupancyError += Math.abs(target.occupancy[index] - glyph.occupancy[index]);
    for (let index = 0; index < 4; index += 1) orientationError += Math.abs(target.orientation[index] - glyph.orientation[index]);
    const hamming = popcount32((target.mask ^ glyph.binaryMask) >>> 0) / 32;
    const centroid = Math.abs(target.centroidX - glyph.centroidX) + Math.abs(target.centroidY - glyph.centroidY);
    return hamming * 3.2 + Math.abs(target.area - glyph.area) * 1.4 + occupancyError * 0.30 + centroid * 0.70 + orientationError * 0.55;
  }

  function computeGrid(columns, aspectRatio) {
    const safeColumns = clamp(Math.round(columns || 120), 60, 200);
    const safeAspect = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 16 / 9;
    return {
      columns: safeColumns,
      rows: Math.max(1, Math.round(safeColumns / safeAspect / 2))
    };
  }

  function getEffectTuning(value, style = "adaptive") {
    const control = clamp(Number(value) || 0, 0, 1);
    const level = 0.12 + 0.88 * Math.pow(control, 1.28);
    const styleAdjustments = {
      adaptive: { luminance: 0, delta: 0, edge: 0, eventBase: 42, eventRange: 27 },
      phosphor: { luminance: -8, delta: -3, edge: 0, eventBase: 35, eventRange: 24 },
      auras: { luminance: -12, delta: 0, edge: -8, eventBase: 40, eventRange: 24 },
      outline: { luminance: -4, delta: 0, edge: 0, eventBase: 44, eventRange: 26 }
    }[style] || { luminance: 0, delta: 0, edge: 0, eventBase: 42, eventRange: 27 };
    const mixed = style === "adaptive";
    const mixScale = mixed ? 0.82 : 1;
    return {
      control,
      level,
      hotspotLuminance: 191 - 43 * level + styleAdjustments.luminance,
      eventLuminance: 167 - 43 * level + styleAdjustments.luminance,
      hotspotDelta: 21 - 12 * level + styleAdjustments.delta,
      hotspotEdge: 118 - 64 * level + styleAdjustments.edge,
      eventDelta: styleAdjustments.eventBase - styleAdjustments.eventRange * level,
      outlineEdge: 128 - 68 * level,
      maxAuras: 1 + Math.round(2 * level),
      maxOutlines: mixed ? 32 + Math.round(40 * level) : 36 + Math.round(52 * level),
      maxParticles: mixed ? 10 + Math.round(30 * level) : 12 + Math.round(36 * level),
      particleSpawn: 1 + Math.round(5 * level),
      rayCount: 3 + Math.round((mixed ? 3 : 4) * level),
      radiusScale: 0.65 + 0.70 * level,
      auraOpacity: (0.08 + 0.20 * level) * mixScale,
      bloomOpacity: (0.18 + 0.38 * level) * (mixed ? 0.84 : 1),
      rayOpacity: (0.035 + 0.085 * level) * (mixed ? 0.80 : 1),
      outlineDarkOpacity: (0.16 + 0.36 * level) * (mixed ? 0.78 : 1),
      outlineLightOpacity: (0.10 + 0.28 * level) * (mixed ? 0.78 : 1),
      particleOpacity: (0.24 + 0.38 * level) * mixScale,
      lineWidth: 0.65 + 0.90 * level,
      trailFade: style === "phosphor" ? 0.14 - 0.07 * level : 0.30 - 0.12 * level
    };
  }

  function getCowTiming(now, firstAppearance = false, randomValue = Math.random()) {
    const safeNow = Math.max(0, Number(now) || 0);
    const random = clamp(Number(randomValue) || 0, 0, 1);
    if (firstAppearance) {
      return {
        eligibleAt: safeNow + 7000 + 7000 * random,
        forceAt: safeNow + 22000
      };
    }
    const eligibleAt = safeNow + 45000 + 25000 * random;
    return {
      eligibleAt,
      forceAt: eligibleAt + 30000
    };
  }

  function isCowMoment(metrics = {}) {
    const mean = Number(metrics.mean) || 0;
    const motion = Number(metrics.motion) || 0;
    const edge = Number(metrics.edge) || 0;
    return mean > 24 && mean < 236 && motion < 46 && edge < 180;
  }

  function resolveFrameSettings(settings = {}) {
    const square = settings.crop11 || settings.zoom11 || settings.squash11;
    const fourThree = !square && (settings.crop43 || settings.zoom43 || settings.squash43);
    if (square) return {
      aspect: 1,
      label: "1:1",
      squash: Boolean(settings.squash11),
      zoom: settings.zoom11 ? 1.25 : 1
    };
    if (fourThree) return {
      aspect: 4 / 3,
      label: "4:3",
      squash: Boolean(settings.squash43),
      zoom: settings.zoom43 ? 1.25 : 1
    };
    return { aspect: null, label: "", squash: false, zoom: 1 };
  }

  function computeSourceRect(width, height, targetAspectRatio, zoom = 1) {
    const safeWidth = Math.max(1, Number(width) || 1);
    const safeHeight = Math.max(1, Number(height) || 1);
    const sourceAspect = safeWidth / safeHeight;
    const targetAspect = Number.isFinite(targetAspectRatio) && targetAspectRatio > 0
      ? targetAspectRatio
      : sourceAspect;
    let cropWidth = safeWidth;
    let cropHeight = safeHeight;

    if (sourceAspect > targetAspect) cropWidth = safeHeight * targetAspect;
    else if (sourceAspect < targetAspect) cropHeight = safeWidth / targetAspect;

    const safeZoom = clamp(Number(zoom) || 1, 1, 4);
    cropWidth /= safeZoom;
    cropHeight /= safeZoom;
    return {
      x: (safeWidth - cropWidth) / 2,
      y: (safeHeight - cropHeight) / 2,
      width: cropWidth,
      height: cropHeight
    };
  }

  function traceVectorField(source, width, height, settings = {}) {
    const safeWidth = Math.max(3, Math.round(width));
    const safeHeight = Math.max(3, Math.round(height));
    const pixelCount = safeWidth * safeHeight;
    const detail = clamp(Number(settings.detail ?? 0.62), 0, 1);
    const reach = clamp(Math.round(Number(settings.reach) || 4), 1, 10);
    const luminance = new Float32Array(pixelCount);
    const gradientX = new Float32Array(pixelCount);
    const gradientY = new Float32Array(pixelCount);
    const magnitude = new Float32Array(pixelCount);

    for (let index = 0; index < pixelCount; index += 1) {
      const offset = index * 4;
      luminance[index] = source[offset] * 0.299 + source[offset + 1] * 0.587 + source[offset + 2] * 0.114;
    }

    for (let y = 1; y < safeHeight - 1; y += 1) {
      for (let x = 1; x < safeWidth - 1; x += 1) {
        const index = y * safeWidth + x;
        const topLeft = luminance[index - safeWidth - 1];
        const top = luminance[index - safeWidth];
        const topRight = luminance[index - safeWidth + 1];
        const left = luminance[index - 1];
        const right = luminance[index + 1];
        const bottomLeft = luminance[index + safeWidth - 1];
        const bottom = luminance[index + safeWidth];
        const bottomRight = luminance[index + safeWidth + 1];
        const gx = -topLeft - 2 * left - bottomLeft + topRight + 2 * right + bottomRight;
        const gy = -topLeft - 2 * top - topRight + bottomLeft + 2 * bottom + bottomRight;
        gradientX[index] = gx;
        gradientY[index] = gy;
        magnitude[index] = Math.hypot(gx, gy) * 0.25;
      }
    }

    const pointAt = new Int32Array(pixelCount);
    pointAt.fill(-1);
    const points = [];
    const edgeFloor = 56 - detail * 42;
    const lightFloor = Math.max(72, Number(settings.blackThreshold ?? 0.035) * 1020);
    const stippleModulo = Math.max(9, Math.round(25 - detail * 14));

    for (let y = 1; y < safeHeight - 1; y += 1) {
      for (let x = 1; x < safeWidth - 1; x += 1) {
        const index = y * safeWidth + x;
        const strength = magnitude[index];
        const gx = gradientX[index];
        const gy = gradientY[index];
        const absX = Math.abs(gx);
        const absY = Math.abs(gy);
        let before;
        let after;
        if (absX > absY * 1.8) {
          before = magnitude[index - 1];
          after = magnitude[index + 1];
        } else if (absY > absX * 1.8) {
          before = magnitude[index - safeWidth];
          after = magnitude[index + safeWidth];
        } else if (gx * gy >= 0) {
          before = magnitude[index - safeWidth - 1];
          after = magnitude[index + safeWidth + 1];
        } else {
          before = magnitude[index - safeWidth + 1];
          after = magnitude[index + safeWidth - 1];
        }
        const edgePoint = strength >= edgeFloor && strength >= before && strength >= after;
        const stipplePoint = settings.points !== false && luminance[index] > lightFloor &&
          ((x * 17 + y * 31) % stippleModulo === 0);
        if (!edgePoint && !stipplePoint) continue;

        const gradientLength = Math.hypot(gx, gy);
        let tangentX = gradientLength > 0 ? -gy / gradientLength : 1;
        let tangentY = gradientLength > 0 ? gx / gradientLength : 0;
        if (tangentX < 0 || (tangentX === 0 && tangentY < 0)) {
          tangentX *= -1;
          tangentY *= -1;
        }
        pointAt[index] = points.length;
        points.push({ x, y, strength, tangentX, tangentY, sampleIndex: index });
      }
    }

    const segments = [];
    for (let pointIndex = 0; pointIndex < points.length; pointIndex += 1) {
      const point = points[pointIndex];
      let bestIndex = -1;
      let bestScore = Infinity;
      for (let step = 1; step <= reach; step += 1) {
        const targetX = Math.round(point.x + point.tangentX * step);
        const targetY = Math.round(point.y + point.tangentY * step);
        for (let oy = -1; oy <= 1; oy += 1) {
          for (let ox = -1; ox <= 1; ox += 1) {
            const candidateX = targetX + ox;
            const candidateY = targetY + oy;
            if (candidateX <= 0 || candidateX >= safeWidth - 1 || candidateY <= 0 || candidateY >= safeHeight - 1) continue;
            const candidateIndex = pointAt[candidateY * safeWidth + candidateX];
            if (candidateIndex < 0 || candidateIndex === pointIndex) continue;
            const candidate = points[candidateIndex];
            const dx = candidate.x - point.x;
            const dy = candidate.y - point.y;
            const distance = Math.hypot(dx, dy);
            if (distance > reach + 1.5) continue;
            const directionAlignment = (dx * point.tangentX + dy * point.tangentY) / distance;
            const tangentAlignment = Math.abs(point.tangentX * candidate.tangentX + point.tangentY * candidate.tangentY);
            if (directionAlignment < 0.38 || tangentAlignment < 0.35) continue;
            const score = distance + (1 - directionAlignment) * 4 + (1 - tangentAlignment) * 2 - candidate.strength * 0.004;
            if (score < bestScore) { bestIndex = candidateIndex; bestScore = score; }
          }
        }
        if (bestIndex >= 0) break;
      }
      if (bestIndex >= 0) segments.push([pointIndex, bestIndex]);
    }

    return { points, segments, luminance };
  }

  function createBuffers(columns, rows) {
    const count = columns * rows;
    return {
      columns,
      rows,
      glyphs: new Uint16Array(count),
      colors: new Uint8ClampedArray(count * 3),
      backgrounds: new Uint8ClampedArray(count * 3),
      scores: new Float32Array(count),
      polarities: new Uint8Array(count),
      history: new Uint8Array(count),
      image: new Uint8ClampedArray(columns * CELL_WIDTH * rows * CELL_HEIGHT * 4)
    };
  }

  function energy(r, g, b) {
    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    const saturation = max === 0 ? 0 : (max - min) / max;
    return max * (0.86 + 0.14 * saturation);
  }

  function closestPaletteColor(r, g, b, palette) {
    let best = palette[0];
    let bestDistance = Infinity;
    for (let i = 0; i < palette.length; i += 1) {
      const color = palette[i];
      const dr = r - color[0];
      const dg = g - color[1];
      const db = b - color[2];
      const distance = dr * dr * 0.30 + dg * dg * 0.59 + db * db * 0.11;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = color;
      }
    }
    return best;
  }

  function closestPaletteIndex(r, g, b, palette) {
    let bestIndex = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < palette.length; i += 1) {
      const color = palette[i];
      const dr = r - color[0];
      const dg = g - color[1];
      const db = b - color[2];
      const distance = dr * dr * 0.30 + dg * dg * 0.59 + db * db * 0.11;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }
    return bestIndex;
  }

  function styledColor(style, r, g, b) {
    const luminance = clamp(Math.round(r * 0.299 + g * 0.587 + b * 0.114), 0, 255);
    const monochrome = {
      blackwhite: [255, 255, 255],
      cyan: [0, 255, 255],
      yellow: [255, 230, 0],
      green: [42, 255, 72],
      red: [255, 74, 48],
      purple: [214, 54, 255],
      blue: [45, 110, 255],
      pink: [255, 75, 174],
      orange: [255, 130, 25],
      amber: [255, 188, 45],
      ice: [150, 220, 255],
      toxic: [190, 255, 0],
      sepia: [218, 164, 104],
      vexitrexi: [205, 255, 205],
      trash80: [110, 255, 110]
    }[style];

    if (monochrome) {
      const scale = luminance / 255;
      return (
        Math.round(monochrome[0] * scale) << 16 |
        Math.round(monochrome[1] * scale) << 8 |
        Math.round(monochrome[2] * scale)
      );
    }

    if (style === "nativeglyph") return Math.round(r) << 16 | Math.round(g) << 8 | Math.round(b);

    if ([
      "sunburst", "moonburst", "mooburst", "ruby", "enchantedforest", "nightburst", "snowburst",
      "cyberburst", "grapeburst", "candyburst", "chromaburst", "soulburst",
      "space", "caveman", "oceania", "metallics", "silvergold", "oldtv",
      "virtualb", "gbdmg", "apple2green"
    ].includes(style)) {
      const palette = FIXED_PALETTES[style];
      const position = luminance / 255 * (palette.length - 1);
      const low = palette[Math.floor(position)];
      const high = palette[Math.ceil(position)];
      const mix = position - Math.floor(position);
      r = low[0] + (high[0] - low[0]) * mix;
      g = low[1] + (high[1] - low[1]) * mix;
      b = low[2] + (high[2] - low[2]) * mix;
    }

    if (style === "psychedelic") {
      const rotated = [g, b, r];
      r = rotated[0]; g = rotated[1]; b = rotated[2];
    }

    const grade = {
      cga: [1.65, 1.16],
      ega: [1.42, 1.10],
      vga: [1.18, 1.05],
      svga: [1.08, 1.03],
      nes: [1.38, 1.08],
      sms: [1.62, 1.12],
      genesis: [1.42, 1.08],
      c64: [1.18, 0.98],
      apple2e: [1.55, 1.10],
      virtualb: [2.10, 0.92],
      gbdmg: [0.55, 0.94],
      apple2green: [1.25, 1.08],
      snes: [1.28, 1.04],
      zedexspectral: [1.82, 1.15],
      atari2600: [1.36, 1.02],
      atari5200: [1.32, 1.04],
      eighties: [1.78, 1.13],
      psychedelic: [2.05, 1.17],
      supercomic: [1.95, 1.19],
      hyperreal: [1.60, 1.12]
    }[style];
    if (grade) {
      r = clamp((luminance + (r - luminance) * grade[0] - 128) * grade[1] + 128, 0, 255);
      g = clamp((luminance + (g - luminance) * grade[0] - 128) * grade[1] + 128, 0, 255);
      b = clamp((luminance + (b - luminance) * grade[0] - 128) * grade[1] + 128, 0, 255);
    }
    return Math.round(r) << 16 | Math.round(g) << 8 | Math.round(b);
  }

  function uniformCube(levelCount, style) {
    const colors = [];
    for (let ri = 0; ri < levelCount; ri += 1) {
      for (let gi = 0; gi < levelCount; gi += 1) {
        for (let bi = 0; bi < levelCount; bi += 1) {
          const r = Math.round(ri * 255 / (levelCount - 1));
          const g = Math.round(gi * 255 / (levelCount - 1));
          const b = Math.round(bi * 255 / (levelCount - 1));
          const packed = styledColor(style, r, g, b);
          colors.push([(packed >> 16) & 255, (packed >> 8) & 255, packed & 255]);
        }
      }
    }
    return colors;
  }

  function uniqueColors(colors) {
    const seen = new Set();
    return colors.filter((color) => {
      const key = color[0] << 16 | color[1] << 8 | color[2];
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function ensureColorCount(colors, count) {
    const result = uniqueColors(colors);
    const seen = new Set(result.map((color) => color[0] << 16 | color[1] << 8 | color[2]));
    for (let value = 0; result.length < count && value < 256; value += 1) {
      for (let offset = 0; result.length < count && offset < 8; offset += 1) {
        const color = [value, clamp(value + offset, 0, 255), clamp(value + offset * 2, 0, 255)];
        const key = color[0] << 16 | color[1] << 8 | color[2];
        if (!seen.has(key)) {
          seen.add(key);
          result.push(color);
        }
      }
    }
    return result;
  }

  function farthestPalette(candidates, count) {
    if (candidates.length <= count) return candidates.slice(0, count);
    const selected = [];
    const selectedKeys = new Set();
    const minimumDistances = new Float64Array(candidates.length);
    minimumDistances.fill(Infinity);

    function add(index) {
      const color = candidates[index];
      selected.push(color);
      selectedKeys.add(color[0] << 16 | color[1] << 8 | color[2]);
      for (let i = 0; i < candidates.length; i += 1) {
        const candidate = candidates[i];
        const dr = candidate[0] - color[0];
        const dg = candidate[1] - color[1];
        const db = candidate[2] - color[2];
        const distance = dr * dr * 0.30 + dg * dg * 0.59 + db * db * 0.11;
        if (distance < minimumDistances[i]) minimumDistances[i] = distance;
      }
    }

    add(closestPaletteIndex(0, 0, 0, candidates));
    if (count > 1) add(closestPaletteIndex(255, 255, 255, candidates));
    while (selected.length < count) {
      let next = 0;
      let farthest = -1;
      for (let i = 0; i < candidates.length; i += 1) {
        const color = candidates[i];
        const key = color[0] << 16 | color[1] << 8 | color[2];
        if (!selectedKeys.has(key) && minimumDistances[i] > farthest) {
          farthest = minimumDistances[i];
          next = i;
        }
      }
      add(next);
    }
    return selected;
  }

  function buildPalette(style, depth) {
    const count = clamp(Number(depth) || 32, 2, 256);
    if (["blackwhite", "cyan", "yellow", "green", "red", "purple", "blue", "pink", "orange", "amber", "ice", "toxic", "sepia", "vexitrexi", "trash80"].includes(style)) {
      const colors = [];
      const peak = styledColor(style, 255, 255, 255);
      const target = [(peak >> 16) & 255, (peak >> 8) & 255, peak & 255];
      for (let i = 0; i < count; i += 1) {
        const position = i / (count - 1);
        colors.push(target.map((channel) => Math.round(channel * position)));
      }
      return ensureColorCount(colors, count).slice(0, count);
    }

    let candidates;
    if (style === "cga") candidates = [...ANSI_16, ...uniformCube(8, style)];
    else if (style === "ega") candidates = [...EGA_64, ...uniformCube(8, style)];
    else if (style === "vga") candidates = [...uniformCube(6, style), ...uniformCube(8, style)];
    else if (FIXED_PALETTES[style]) candidates = [...FIXED_PALETTES[style], ...uniformCube(8, style)];
    else candidates = uniformCube(8, style);
    return farthestPalette(ensureColorCount(candidates, count), count);
  }

  function getPaletteBundle(style = "standard", depth = 32) {
    if (depth === "truecolor" || style === "nativeglyph") return null;
    const normalizedDepth = PALETTE_DEPTHS.includes(Number(depth)) ? Number(depth) : 32;
    const key = `${style}:${normalizedDepth}`;
    if (paletteCache.has(key)) return paletteCache.get(key);
    const palette = buildPalette(style, normalizedDepth);
    const lookup = new Uint16Array(32 * 32 * 32);
    for (let r = 0; r < 32; r += 1) {
      for (let g = 0; g < 32; g += 1) {
        for (let b = 0; b < 32; b += 1) {
          const index = r << 10 | g << 5 | b;
          lookup[index] = closestPaletteIndex(r * 8 + 4, g * 8 + 4, b * 8 + 4, palette);
        }
      }
    }
    const bundle = { palette, lookup };
    paletteCache.set(key, bundle);
    return bundle;
  }

  function quantizeColor(style = "standard", depth = 32, r = 0, g = 0, b = 0, settings = {}) {
    const saturationBoost = Number(settings.saturationBoost ?? 0);
    const brightnessBoost = Number(settings.brightnessBoost ?? 0);
    let colorR = clamp(Number(r) || 0, 0, 255);
    let colorG = clamp(Number(g) || 0, 0, 255);
    let colorB = clamp(Number(b) || 0, 0, 255);
    const peak = Math.max(colorR, colorG, colorB);
    const trough = Math.min(colorR, colorG, colorB);
    const saturation = peak === 0 ? 0 : (peak - trough) / peak;
    if (saturation >= 0.02) {
      const targetSaturation = clamp(saturation * (1 + saturationBoost) + 0.06, 0, 1);
      const chromaScale = targetSaturation / saturation;
      colorR = clamp(peak - (peak - colorR) * chromaScale, 0, 255);
      colorG = clamp(peak - (peak - colorG) * chromaScale, 0, 255);
      colorB = clamp(peak - (peak - colorB) * chromaScale, 0, 255);
    }
    const valueScale = peak === 0 ? 0 : Math.min(255, peak * (1 + brightnessBoost)) / peak;
    colorR = Math.round(colorR * valueScale);
    colorG = Math.round(colorG * valueScale);
    colorB = Math.round(colorB * valueScale);
    const styled = styledColor(style, colorR, colorG, colorB);
    colorR = (styled >> 16) & 255;
    colorG = (styled >> 8) & 255;
    colorB = styled & 255;
    const paletteBundle = getPaletteBundle(style, depth);
    if (paletteBundle) {
      const lookupIndex = colorR >> 3 << 10 | colorG >> 3 << 5 | colorB >> 3;
      const matched = paletteBundle.palette[paletteBundle.lookup[lookupIndex]];
      return [matched[0], matched[1], matched[2]];
    }
    return [colorR, colorG, colorB];
  }

  function invertLuminanceColor(r, g, b) {
    const color = [clamp(Number(r) || 0, 0, 255), clamp(Number(g) || 0, 0, 255), clamp(Number(b) || 0, 0, 255)];
    const luminance = color[0] * 0.299 + color[1] * 0.587 + color[2] * 0.114;
    const target = 255 - luminance;
    if (Math.abs(target - luminance) < 0.5) return color.map(Math.round);
    if (target < luminance) {
      const scale = target / Math.max(1, luminance);
      return color.map((channel) => Math.round(clamp(channel * scale, 0, 255)));
    }
    const scale = (255 - target) / Math.max(1, 255 - luminance);
    return color.map((channel) => Math.round(clamp(255 - (255 - channel) * scale, 0, 255)));
  }

  function chooseGlyph(e0, e1, e2, e3, thresholds) {
    const top = (e0 + e1) * 0.5;
    const bottom = (e2 + e3) * 0.5;
    const left = (e0 + e2) * 0.5;
    const right = (e1 + e3) * 0.5;
    const average = (e0 + e1 + e2 + e3) * 0.25;
    if (average < thresholds.black) return GLYPH.SPACE;

    const vertical = Math.abs(top - bottom);
    const horizontal = Math.abs(left - right);
    if (Math.max(vertical, horizontal) > thresholds.edge && Math.max(top, bottom, left, right) > 0.22) {
      if (vertical >= horizontal) return top > bottom ? GLYPH.UPPER : GLYPH.LOWER;
      return left > right ? GLYPH.LEFT : GLYPH.RIGHT;
    }
    if (average < 0.19) return GLYPH.LIGHT;
    if (average < 0.42) return GLYPH.MEDIUM;
    if (average < 0.72) return GLYPH.DARK;
    return GLYPH.FULL;
  }

  function chooseGlyphForSet(setName, e0, e1, e2, e3, thresholds, r, g, b) {
    if (setName === "restrictAnsi" || !GLYPH_SETS[setName]) return chooseGlyph(e0, e1, e2, e3, thresholds);
    const set = GLYPH_SETS[setName];
    const average = (e0 + e1 + e2 + e3) * 0.25;

    if (set.type === "binary") return average >= 0.5 ? 1 : 0;

    if (set.type === "emoji") {
      let bestIndex = 0;
      let bestDistance = Infinity;
      for (let index = 0; index < set.colors.length; index += 1) {
        const color = set.colors[index];
        const dr = r - color[1];
        const dg = g - color[2];
        const db = b - color[3];
        const distance = dr * dr * 0.30 + dg * dg * 0.59 + db * db * 0.11;
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      }
      return bestIndex;
    }

    if (average < thresholds.black) return Math.max(0, set.glyphs.indexOf(" "));
    const top = (e0 + e1) * 0.5;
    const bottom = (e2 + e3) * 0.5;
    const left = (e0 + e2) * 0.5;
    const right = (e1 + e3) * 0.5;
    const vertical = Math.abs(top - bottom);
    const horizontal = Math.abs(left - right);
    if (Math.max(vertical, horizontal) > thresholds.edge) {
      const directional = set.type === "ansi" || set.type === "mosaic"
        ? (vertical >= horizontal ? (top > bottom ? "▀" : "▄") : (left > right ? "▌" : "▐"))
        : (vertical >= horizontal ? (top > bottom ? "^" : "_") : (left > right ? "(" : ")"));
      const directionalIndex = set.glyphs.indexOf(directional);
      if (directionalIndex >= 0) return directionalIndex;
    }
    return clamp(Math.round(average * (set.glyphs.length - 1)), 0, set.glyphs.length - 1);
  }

  function getGlyph(setName, index) {
    const set = GLYPH_SETS[setName] || GLYPH_SETS.restrictAnsi;
    return set.glyphs[index] || " ";
  }

  function maskAt(glyph, x, y) {
    switch (glyph) {
      case GLYPH.SPACE: return false;
      case GLYPH.FULL: return true;
      case GLYPH.LOWER: return y >= CELL_HEIGHT / 2;
      case GLYPH.UPPER: return y < CELL_HEIGHT / 2;
      case GLYPH.LEFT: return x < CELL_WIDTH / 2;
      case GLYPH.RIGHT: return x >= CELL_WIDTH / 2;
      case GLYPH.LIGHT: return BAYER_4X4[(y % 4) * 4 + x] < 4;
      case GLYPH.MEDIUM: return BAYER_4X4[(y % 4) * 4 + x] < 8;
      case GLYPH.DARK: return BAYER_4X4[(y % 4) * 4 + x] < 12;
      default: return false;
    }
  }

  function convertVideoGlyphsInto(source, width, height, settings, buffers) {
    const columns = buffers.columns;
    const rows = buffers.rows;
    const outWidth = columns * CELL_WIDTH;
    const style = settings.colorPalette || "standard";
    const depth = settings.paletteDepth ?? 32;
    const stability = clamp(Number(settings.videoGlyphStability ?? 0.48), 0, 1);
    const luma = new Float32Array(32);
    const offsets = new Int32Array(32);
    const brightTarget = createTargetFeatures();
    const darkTarget = createTargetFeatures();

    const keepPreviousColor = (next, previous, history) => {
      if (!history) return next;
      const dr = next[0] - previous[0];
      const dg = next[1] - previous[1];
      const db = next[2] - previous[2];
      const threshold = 7 + stability * 17;
      return dr * dr + dg * dg + db * db <= threshold * threshold ? previous : next;
    };

    for (let cy = 0; cy < rows; cy += 1) {
      for (let cx = 0; cx < columns; cx += 1) {
        let sumLuma = 0;
        let minimum = 255;
        let maximum = 0;
        let sumR = 0;
        let sumG = 0;
        let sumB = 0;
        for (let sy = 0; sy < 8; sy += 1) {
          const sourceY = clamp(Math.floor((cy * 8 + sy + 0.5) * height / (rows * 8)), 0, height - 1);
          for (let sx = 0; sx < 4; sx += 1) {
            const sourceX = clamp(Math.floor((cx * 4 + sx + 0.5) * width / (columns * 4)), 0, width - 1);
            const index = sy * 4 + sx;
            const offset = (sourceY * width + sourceX) * 4;
            const r = source[offset];
            const g = source[offset + 1];
            const b = source[offset + 2];
            const value = r * 0.2126 + g * 0.7152 + b * 0.0722;
            offsets[index] = offset;
            luma[index] = value;
            sumLuma += value;
            minimum = Math.min(minimum, value);
            maximum = Math.max(maximum, value);
            sumR += r;
            sumG += g;
            sumB += b;
          }
        }

        const cellIndex = cy * columns + cx;
        const colorOffset = cellIndex * 3;
        const hadHistory = buffers.history[cellIndex] === 1;
        let glyphIndex = 7;
        let polarity = 0;
        let bestScore = 0;
        let foregroundRaw = [sumR / 32, sumG / 32, sumB / 32];
        let backgroundRaw = foregroundRaw;

        if (maximum - minimum >= 7) {
          const threshold = sumLuma / 32;
          let brightMask = 0;
          let brightCount = 0;
          let darkCount = 0;
          let brightR = 0;
          let brightG = 0;
          let brightB = 0;
          let darkR = 0;
          let darkG = 0;
          let darkB = 0;
          for (let index = 0; index < 32; index += 1) {
            const offset = offsets[index];
            if (luma[index] >= threshold) {
              brightMask = (brightMask | (1 << index)) >>> 0;
              brightCount += 1;
              brightR += source[offset];
              brightG += source[offset + 1];
              brightB += source[offset + 2];
            } else {
              darkCount += 1;
              darkR += source[offset];
              darkG += source[offset + 1];
              darkB += source[offset + 2];
            }
          }
          const darkMask = (~brightMask) >>> 0;
          fillTargetFeatures(brightMask, brightTarget);
          fillTargetFeatures(darkMask, darkTarget);
          bestScore = Infinity;
          for (let candidate = 0; candidate < VIDEO_GLYPH_MASKS.length; candidate += 1) {
            const brightScore = scoreVideoGlyph(brightTarget, candidate);
            if (brightScore < bestScore) {
              bestScore = brightScore;
              glyphIndex = candidate;
              polarity = 0;
            }
            const darkScore = scoreVideoGlyph(darkTarget, candidate);
            if (darkScore < bestScore) {
              bestScore = darkScore;
              glyphIndex = candidate;
              polarity = 1;
            }
          }

          if (hadHistory) {
            const previousGlyph = buffers.glyphs[cellIndex];
            const previousPolarity = buffers.polarities[cellIndex];
            const previousTarget = previousPolarity ? darkTarget : brightTarget;
            const previousScore = scoreVideoGlyph(previousTarget, previousGlyph);
            const keepMargin = 0.06 + stability * 0.34;
            const enteringTexture = glyphIndex >= 60 && previousGlyph !== glyphIndex;
            const textureMargin = 0.22 + stability * 0.36;
            if (previousScore <= bestScore + keepMargin || (enteringTexture && previousScore <= bestScore + textureMargin)) {
              glyphIndex = previousGlyph;
              polarity = previousPolarity;
              bestScore = previousScore;
            }
          }

          const highColor = [brightR / Math.max(1, brightCount), brightG / Math.max(1, brightCount), brightB / Math.max(1, brightCount)];
          const lowColor = [darkR / Math.max(1, darkCount), darkG / Math.max(1, darkCount), darkB / Math.max(1, darkCount)];
          foregroundRaw = polarity ? lowColor : highColor;
          backgroundRaw = polarity ? highColor : lowColor;
        }

        const numericDepth = Number(depth);
        const ditherStrength = Number.isFinite(numericDepth) && numericDepth <= 16
          ? (DISPERSED_4X4[(cy & 3) * 4 + (cx & 3)] / 15 - 0.5) * 12
          : 0;
        let foreground = quantizeColor(style, depth,
          foregroundRaw[0] + ditherStrength, foregroundRaw[1] + ditherStrength, foregroundRaw[2] + ditherStrength, settings);
        let background = quantizeColor(style, depth,
          backgroundRaw[0] - ditherStrength, backgroundRaw[1] - ditherStrength, backgroundRaw[2] - ditherStrength, settings);
        if (hadHistory) {
          foreground = keepPreviousColor(foreground, [buffers.colors[colorOffset], buffers.colors[colorOffset + 1], buffers.colors[colorOffset + 2]], true);
          background = keepPreviousColor(background, [buffers.backgrounds[colorOffset], buffers.backgrounds[colorOffset + 1], buffers.backgrounds[colorOffset + 2]], true);
        }

        buffers.glyphs[cellIndex] = glyphIndex;
        buffers.polarities[cellIndex] = polarity;
        buffers.scores[cellIndex] = bestScore;
        buffers.history[cellIndex] = 1;
        buffers.colors[colorOffset] = foreground[0];
        buffers.colors[colorOffset + 1] = foreground[1];
        buffers.colors[colorOffset + 2] = foreground[2];
        buffers.backgrounds[colorOffset] = background[0];
        buffers.backgrounds[colorOffset + 1] = background[1];
        buffers.backgrounds[colorOffset + 2] = background[2];

        const mask = VIDEO_GLYPH_MASKS[glyphIndex];
        for (let py = 0; py < CELL_HEIGHT; py += 1) {
          const rowMask = mask[py];
          for (let px = 0; px < CELL_WIDTH; px += 1) {
            const outputOffset = ((cy * CELL_HEIGHT + py) * outWidth + cx * CELL_WIDTH + px) * 4;
            const color = rowMask & (0x80 >> px) ? foreground : background;
            buffers.image[outputOffset] = color[0];
            buffers.image[outputOffset + 1] = color[1];
            buffers.image[outputOffset + 2] = color[2];
            buffers.image[outputOffset + 3] = 255;
          }
        }
      }
    }
    return buffers;
  }

  function convertInto(source, width, height, settings, buffers) {
    const saturationBoost = Number(settings.saturationBoost ?? 0.42);
    const brightnessBoost = Number(settings.brightnessBoost ?? 0.17);
    const thresholds = {
      black: Number(settings.blackThreshold ?? 0.035),
      edge: Number(settings.edgeThreshold ?? 0.24)
    };
    const legacyPalette = settings.palette;
    const colorPalette = settings.colorPalette || "standard";
    const glyphSet = settings.glyphSet || "restrictAnsi";
    const paletteDepth = settings.paletteDepth || (legacyPalette === "ansi16" ? 16 : legacyPalette === "truecolor" ? "truecolor" : 32);
    const glyphDefinition = GLYPH_SETS[glyphSet] || GLYPH_SETS.restrictAnsi;
    if (glyphDefinition.type === "bitmap") return convertVideoGlyphsInto(source, width, height, settings, buffers);
    const paletteBundle = glyphDefinition.type === "emoji" && glyphDefinition.nativeColor
      ? null
      : getPaletteBundle(colorPalette, paletteDepth);
    const columns = buffers.columns;
    const rows = buffers.rows;
    const outWidth = columns * CELL_WIDTH;

    for (let cy = 0; cy < rows; cy += 1) {
      for (let cx = 0; cx < columns; cx += 1) {
        const sampleX0 = clamp(Math.floor((cx + 0.25) * width / columns), 0, width - 1);
        const sampleX1 = clamp(Math.floor((cx + 0.75) * width / columns), 0, width - 1);
        const sampleY0 = clamp(Math.floor((cy + 0.25) * height / rows), 0, height - 1);
        const sampleY1 = clamp(Math.floor((cy + 0.75) * height / rows), 0, height - 1);
        const offset0 = (sampleY0 * width + sampleX0) * 4;
        const offset1 = (sampleY0 * width + sampleX1) * 4;
        const offset2 = (sampleY1 * width + sampleX0) * 4;
        const offset3 = (sampleY1 * width + sampleX1) * 4;
        const energy0 = energy(source[offset0], source[offset0 + 1], source[offset0 + 2]);
        const energy1 = energy(source[offset1], source[offset1 + 1], source[offset1 + 2]);
        const energy2 = energy(source[offset2], source[offset2 + 1], source[offset2 + 2]);
        const energy3 = energy(source[offset3], source[offset3 + 1], source[offset3 + 2]);
        const cellIndex = cy * columns + cx;
        const weight0 = 0.08 + energy0 * energy0;
        const weight1 = 0.08 + energy1 * energy1;
        const weight2 = 0.08 + energy2 * energy2;
        const weight3 = 0.08 + energy3 * energy3;
        const weightTotal = weight0 + weight1 + weight2 + weight3;
        let r = source[offset0] * weight0 + source[offset1] * weight1 + source[offset2] * weight2 + source[offset3] * weight3;
        let g = source[offset0 + 1] * weight0 + source[offset1 + 1] * weight1 + source[offset2 + 1] * weight2 + source[offset3 + 1] * weight3;
        let b = source[offset0 + 2] * weight0 + source[offset1 + 2] * weight1 + source[offset2 + 2] * weight2 + source[offset3 + 2] * weight3;
        r /= weightTotal; g /= weightTotal; b /= weightTotal;
        const peak = Math.max(r, g, b);
        const trough = Math.min(r, g, b);
        const saturation = peak === 0 ? 0 : (peak - trough) / peak;
        if (saturation >= 0.02) {
          const targetSaturation = clamp(saturation * (1 + saturationBoost) + 0.06, 0, 1);
          const chromaScale = targetSaturation / saturation;
          r = clamp(peak - (peak - r) * chromaScale, 0, 255);
          g = clamp(peak - (peak - g) * chromaScale, 0, 255);
          b = clamp(peak - (peak - b) * chromaScale, 0, 255);
        }
        const valueScale = peak === 0 ? 0 : Math.min(255, peak * (1 + brightnessBoost)) / peak;
        let colorR = Math.round(r * valueScale);
        let colorG = Math.round(g * valueScale);
        let colorB = Math.round(b * valueScale);
        const glyphColorR = colorR;
        const glyphColorG = colorG;
        const glyphColorB = colorB;
        const styled = styledColor(colorPalette, colorR, colorG, colorB);
        colorR = (styled >> 16) & 255;
        colorG = (styled >> 8) & 255;
        colorB = styled & 255;
        if (paletteBundle) {
          const lookupIndex = colorR >> 3 << 10 | colorG >> 3 << 5 | colorB >> 3;
          const matched = paletteBundle.palette[paletteBundle.lookup[lookupIndex]];
          colorR = matched[0];
          colorG = matched[1];
          colorB = matched[2];
        }
        if (colorPalette === "nativeglyph" && glyphSet === "restrictAnsi") {
          colorR = 255; colorG = 255; colorB = 255;
        }

        const glyph = chooseGlyphForSet(glyphSet, energy0, energy1, energy2, energy3, thresholds, glyphColorR, glyphColorG, glyphColorB);
        buffers.glyphs[cellIndex] = glyph;

        const colorOffset = cellIndex * 3;
        buffers.colors[colorOffset] = colorR;
        buffers.colors[colorOffset + 1] = colorG;
        buffers.colors[colorOffset + 2] = colorB;

        if (glyphSet === "restrictAnsi") {
          for (let py = 0; py < CELL_HEIGHT; py += 1) {
            for (let px = 0; px < CELL_WIDTH; px += 1) {
              const outputOffset = ((cy * CELL_HEIGHT + py) * outWidth + cx * CELL_WIDTH + px) * 4;
              const lit = maskAt(glyph, px, py);
              buffers.image[outputOffset] = lit ? colorR : 0;
              buffers.image[outputOffset + 1] = lit ? colorG : 0;
              buffers.image[outputOffset + 2] = lit ? colorB : 0;
              buffers.image[outputOffset + 3] = 255;
            }
          }
        }
      }
    }
    return buffers;
  }

  function sgr16(index) {
    if (index < 8) return `\u001b[${30 + index}m`;
    return `\u001b[${90 + index - 8}m`;
  }

  function buildAns(buffers, paletteMode, glyphSet = "restrictAnsi") {
    const lines = [];
    for (let row = 0; row < buffers.rows; row += 1) {
      let line = "\u001b[48;2;0;0;0m";
      let previous = "";
      for (let column = 0; column < buffers.columns; column += 1) {
        const cell = row * buffers.columns + column;
        const colorOffset = cell * 3;
        const r = buffers.colors[colorOffset];
        const g = buffers.colors[colorOffset + 1];
        const b = buffers.colors[colorOffset + 2];
        let escape;
        if (paletteMode === "ansi16") {
          const matched = closestPaletteColor(r, g, b, ANSI_16);
          const index = ANSI_16.indexOf(matched);
          escape = `16:${index}`;
          if (escape !== previous) line += sgr16(index);
        } else {
          escape = `${r},${g},${b}`;
          if (escape !== previous) line += `\u001b[38;2;${r};${g};${b}m`;
        }
        previous = escape;
        line += getGlyph(glyphSet, buffers.glyphs[cell]);
      }
      lines.push(`${line}\u001b[0m`);
    }
    return `${lines.join("\n")}\n`;
  }

  return {
    GLYPHS,
    CELL_WIDTH,
    CELL_HEIGHT,
    ANSI_16,
    ANSI_32,
    VIDEO_GLYPH_NAMES,
    VIDEO_GLYPH_MASKS,
    GLYPH_SETS,
    PALETTE_DEPTHS,
    computeGrid,
    computeSourceRect,
    getEffectTuning,
    getCowTiming,
    isCowMoment,
    resolveFrameSettings,
    traceVectorField,
    createBuffers,
    getPaletteBundle,
    quantizeColor,
    invertLuminanceColor,
    getGlyph,
    convertInto,
    buildAns
  };
});
