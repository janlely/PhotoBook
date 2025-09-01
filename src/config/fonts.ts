export const FONT_CONFIG = {
  // 默认预览文字，可配置
  previewText: "字体样式",
  
  // 英文字体列表
  englishFonts: [
    // 经典无衬线字体
    { name: 'Arial', displayName: 'Arial' },
    { name: 'Helvetica', displayName: 'Helvetica' },
    { name: 'Verdana', displayName: 'Verdana' },
    { name: 'Tahoma', displayName: 'Tahoma' },
    { name: 'Trebuchet MS', displayName: 'Trebuchet MS' },
    { name: 'Century Gothic', displayName: 'Century Gothic' },
    { name: 'Franklin Gothic Medium', displayName: 'Franklin Gothic Medium' },
    { name: 'Arial Black', displayName: 'Arial Black' },
    
    // 经典衬线字体
    { name: 'Times New Roman', displayName: 'Times New Roman' },
    { name: 'Georgia', displayName: 'Georgia' },
    { name: 'Palatino', displayName: 'Palatino' },
    { name: 'Book Antiqua', displayName: 'Book Antiqua' },
    { name: 'Garamond', displayName: 'Garamond' },
    { name: 'Baskerville', displayName: 'Baskerville' },
    
    // 等宽字体
    { name: 'Courier New', displayName: 'Courier New' },
    { name: 'Monaco', displayName: 'Monaco' },
    { name: 'Lucida Console', displayName: 'Lucida Console' },
    { name: 'Consolas', displayName: 'Consolas' },
    
    // 装饰性字体
    { name: 'Impact', displayName: 'Impact' },
    { name: 'Comic Sans MS', displayName: 'Comic Sans MS' },
    { name: 'Papyrus', displayName: 'Papyrus' },
    { name: 'Brush Script MT', displayName: 'Brush Script MT' },
    
    // 中世纪风格字体
    { name: 'Old English Text MT', displayName: 'Old English Text MT' },
    { name: 'Blackletter', displayName: 'Blackletter' },
    { name: 'Uncial', displayName: 'Uncial' },
    { name: 'Celtic', displayName: 'Celtic' },
    
    // 现代设计字体
    { name: 'Roboto', displayName: 'Roboto' },
    { name: 'Open Sans', displayName: 'Open Sans' },
    { name: 'Lato', displayName: 'Lato' },
    { name: 'Montserrat', displayName: 'Montserrat' },
    { name: 'Source Sans Pro', displayName: 'Source Sans Pro' },
    { name: 'Raleway', displayName: 'Raleway' },
    { name: 'Ubuntu', displayName: 'Ubuntu' },
    { name: 'Nunito', displayName: 'Nunito' },
    
    // 苹果系统字体
    { name: '-apple-system', displayName: 'Apple System Font' },
    { name: 'San Francisco', displayName: 'San Francisco' },
    { name: 'Lucida Grande', displayName: 'Lucida Grande' },
    
    // Web 安全字体
    { name: 'serif', displayName: 'Serif' },
    { name: 'sans-serif', displayName: 'Sans-serif' },
    { name: 'monospace', displayName: 'Monospace' },
    { name: 'cursive', displayName: 'Cursive' },
    { name: 'fantasy', displayName: 'Fantasy' },
  ],
  
  // 中文字体列表
  chineseFonts: [
    // 微软字体系列
    { name: '微软雅黑', displayName: '微软雅黑' },
    { name: 'Microsoft YaHei', displayName: 'Microsoft YaHei' },
    { name: '微软正黑体', displayName: '微软正黑体' },
    { name: 'Microsoft JhengHei', displayName: 'Microsoft JhengHei' },
    
    // 传统四大字体
    { name: '宋体', displayName: '宋体' },
    { name: 'SimSun', displayName: 'SimSun' },
    { name: '黑体', displayName: '黑体' },
    { name: 'SimHei', displayName: 'SimHei' },
    { name: '楷体', displayName: '楷体' },
    { name: 'KaiTi', displayName: 'KaiTi' },
    { name: '仿宋', displayName: '仿宋' },
    { name: 'FangSong', displayName: 'FangSong' },
    
    // 华文字体系列
    { name: '华文细黑', displayName: '华文细黑' },
    { name: 'STXihei', displayName: 'STXihei' },
    { name: '华文黑体', displayName: '华文黑体' },
    { name: 'STHeiti', displayName: 'STHeiti' },
    { name: '华文楷体', displayName: '华文楷体' },
    { name: 'STKaiti', displayName: 'STKaiti' },
    { name: '华文宋体', displayName: '华文宋体' },
    { name: 'STSong', displayName: 'STSong' },
    { name: '华文仿宋', displayName: '华文仿宋' },
    { name: 'STFangsong', displayName: 'STFangsong' },
    
    // 特色中文字体
    { name: '幼圆', displayName: '幼圆' },
    { name: 'YouYuan', displayName: 'YouYuan' },
    { name: '隶书', displayName: '隶书' },
    { name: 'LiSu', displayName: 'LiSu' },
    { name: '方正舒体', displayName: '方正舒体' },
    { name: '方正姚体', displayName: '方正姚体' },
    { name: '华文彩云', displayName: '华文彩云' },
    { name: 'STCaiyun', displayName: 'STCaiyun' },
    { name: '华文琥珀', displayName: '华文琥珀' },
    { name: 'STHupo', displayName: 'STHupo' },
    { name: '华文新魏', displayName: '华文新魏' },
    { name: 'STXinwei', displayName: 'STXinwei' },
    
    // 苹果中文字体
    { name: 'PingFang SC', displayName: 'PingFang SC' },
    { name: 'Hiragino Sans GB', displayName: 'Hiragino Sans GB' },
    { name: 'Heiti SC', displayName: 'Heiti SC' },
    { name: 'Songti SC', displayName: 'Songti SC' },
    
    // 圆体字体
    { name: '造字工房尚雅准圆', displayName: '造字工房尚雅准圆' },
    { name: '汉仪旗黑', displayName: '汉仪旗黑' },
    { name: '思源黑体', displayName: '思源黑体' },
    { name: 'Source Han Sans CN', displayName: 'Source Han Sans CN' },
    { name: '思源宋体', displayName: '思源宋体' },
    { name: 'Source Han Serif CN', displayName: 'Source Han Serif CN' },
  ]
};

// 对齐方式配置
export const TEXT_ALIGN_OPTIONS = [
  { value: 'left', label: '左对齐', iconName: 'FaAlignLeft' },
  { value: 'center', label: '居中', iconName: 'FaAlignCenter' },
  { value: 'right', label: '右对齐', iconName: 'FaAlignRight' },
  { value: 'justify', label: '两端对齐', iconName: 'FaAlignJustify' },
] as const;