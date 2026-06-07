import { Language } from '../types';

export interface TopicCategory {
  id: string;
  emoji: string;
  labels: Record<Language, string>;
  topics: Record<Language, string[]>;
}

export const TOPIC_CATEGORIES: TopicCategory[] = [
  {
    id: "psychology",
    emoji: "🧠",
    labels: {
      Vietnamese: "Tâm lý học",
      English: "Psychology",
      Japanese: "心理学"
    },
    topics: {
      Vietnamese: [
        "Tại sao bạn luôn trì hoãn dù biết là sai",
        "Hiệu ứng Dunning-Kruger: Càng kém càng tự tin",
        "Hội chứng kẻ giả mạo (Imposer Syndrome) đang kìm hãm bạn",
        "Tại sao chúng ta sợ bị từ chối hơn cả thất bại",
        "Cơ chế phòng vệ tâm lý tuyệt mật của não bộ",
        "Hiệu ứng tâm lý đám đông kiểm soát hành vi",
        "Ám ảnh hoàn hảo (Perfectionism) đang âm thầm phá huỷ cuộc đời",
        "Bí mật về não bộ khi bạn có những phút giây rảnh rỗi",
        "Tại sao những người tử tế lại hay phải chịu tổn thương",
        "Sức mạnh vô song của thói quen vô thức"
      ],
      English: [
        "Why you always procrastinate even when you know better",
        "The Dunning-Kruger Effect: The less you know, the more confident",
        "Impostor Syndrome: How it is quietly holding you back",
        "Why we fear rejection more than actual failure",
        "Your brain's hidden psychological defense mechanisms",
        "The shocking psychology of crowd behavior",
        "How perfectionism is quietly ruining your life",
        "What your brain does when you are finally bored",
        "Why kind people get hurt the most by society",
        "The hidden power of unconscious daily habits"
      ],
      Japanese: [
        "なぜ分かっていても先延ばししてしまうのか",
        "ダニング・クルーガー効果：無知ほど自信満々",
        "インポスター症候群がいかにあなたを阻んでいるか",
        "なぜ失敗より「拒絶」を恐れるのか",
        "脳の心理的防衛メカニズムの秘密",
        "群衆心理の仕組みと行動支配",
        "完璧主義が静かにあなたを壊している理由",
        "退屈な時に脳の中で起きていること",
        "なぜ優しい人ほど深く傷つくのか",
        "無意識の習慣が持つ本当の力"
      ]
    }
  },
  {
    id: "success",
    emoji: "🏆",
    labels: {
      Vietnamese: "Thành công & Sự nghiệp",
      English: "Success & Career",
      Japanese: "成功とキャリア"
    },
    topics: {
      Vietnamese: [
        "90% kế hoạch của bạn bị bỏ dở vì lý do ngớ ngẩn này",
        "Sự thật phũ phàng về lời khuyên 'Đuổi theo đam mê'",
        "Tại sao người có năng lực nhất không phải lúc nào cũng thắng",
        "3 thói quen độc hại âm thầm phá huỷ sự nghiệp của bạn",
        "Quy tắc 10.000 giờ liệu có thực sự đúng?",
        "Cách phá vỡ vùng an toàn mà không có cảm giác sợ hãi",
        "Bí quyết của những người luôn có tên trong danh sách thăng chức",
        "Kỹ năng mềm quan trọng hàng đầu trong thế kỷ 21",
        "Tại sao 80% nhân viên ghét sếp của họ",
        "Networking: Stop doing it the wrong way"
      ],
      English: [
        "Why 90% of your plans never get finished",
        "The harsh truth about 'following your passion'",
        "Why the most talented people don't always win",
        "3 toxic habits silently killing your career",
        "Is the 10,000-hour rule actually real or a myth?",
        "How to break out of your comfort zone without fear",
        "What people who always get promoted do differently",
        "The most critical soft skill of the 21st century",
        "Why 80% of employees eventually hate their boss",
        "Networking: Stop doing it the wrong way"
      ],
      Japanese: [
        "計画の9割が途中で消える本当の理由",
        "「好きを仕事に」の残酷な真実",
        "才能ある人が必ず勝つわけではない理由",
        "キャリアを静かに壊す3つの致命的習慣",
        "1万時間の法則は本当に正しいのか？",
        "怖がらずにコンフォートゾーンを抜け出す方法",
        "いつも昇進する人の隠された秘密",
        "21世紀で最も重要なソフトスキル",
        "なぜ社員の80%が上司を嫌うのか",
        "ネットワーキング、その間違ったやり方"
      ]
    }
  },
  {
    id: "finance",
    emoji: "💰",
    labels: {
      Vietnamese: "Tài chính & Tiền bạc",
      English: "Finance & Money",
      Japanese: "お金とファイナンス"
    },
    topics: {
      Vietnamese: [
        "Tại sao bạn mãi nghèo dù làm việc chăm chỉ suốt đời",
        "Sự thật về 'thu nhập thụ động' mà các khoá học luôn che giấu",
        "5 sai lầm tiền bạc nghiêm trọng tuổi 20 ai cũng mắc phải",
        "Tâm lý học tiêu xài: Tại sao tiền cứ tự động bốc hơi",
        "Lãi kép: Kỳ quan thứ 8 tuyệt diệu của thế giới",
        "Bắt đầu đầu tư lần đầu tiên — Nên đi từ đâu?",
        "Bẫy nợ tiêu dùng tinh vi và cách thoát ra nhanh chóng",
        "Người giàu khác người nghèo ở cách tư duy cốt lõi này",
        "Inflation (Lạm phát) đang âm thầm bào mòn ví tiền của bạn",
        "Tại sao chỉ tiết kiệm thì không bao giờ là đủ"
      ],
      English: [
        "Why you are still broke even though you work hard",
        "The hidden truth about 'passive income' courses hide from you",
        "5 fatal money mistakes everyone makes in their 20s",
        "Spending psychology: where does your cash disappear?",
        "Compound interest: the real 8th wonder of the world",
        "Starting your first investment — where to begin?",
        "Modern consumer debt traps and how to escape them",
        "How rich people think drastically differently about money",
        "How inflation is quietly eating your hard-earned savings",
        "Why saving money alone is never enough to be wealthy"
      ],
      Japanese: [
        "なぜ頑張って働いても貧乏のままなのか",
        "「不労所得」セミナーが隠している真実",
        "20代で誰もがやる5つのお金の致命的失敗",
        "お金が消える本当の理由（消費の心理学）",
        "複利：世界の真の第8の不思議",
        "初めての投資、何から始めるべき？",
        "消費者金融の罠と迅速な抜け出し方",
        "お金持ちと貧乏な人のマインドセットの違い",
        "インフレが貯金を静かに削っている現状",
        "貯金だけでは絶対に足りない本当の理由"
      ]
    }
  },
  {
    id: "learning",
    emoji: "📚",
    labels: {
      Vietnamese: "Học tập & Kỹ năng",
      English: "Learning & Skills",
      Japanese: "学習とスキル"
    },
    topics: {
      Vietnamese: [
        "Phương pháp học tập của Harvard giúp bạn vượt trội hơn 80% người",
        "Cách học 12 tiếng một ngày mà không bị kiệt sức",
        "Bí kíp ghi nhớ 90% lượng thông tin chỉ sau một lần đọc",
        "Học thành thạo một ngôn ngữ mới trong 3 tháng có khả thi?",
        "Kỹ thuật Feynman: Cách thức các thiên tài học tập",
        "Tại sao bạn học nhiều nhưng vẫn không thể tự giỏi lên",
        "Active Recall vs Highlighting: Kỹ thuật nào mới thực sự tốt?",
        "Phương pháp Pomodoro: Bí quyết tập trung siêu đẳng",
        "Cách đọc sách nhanh gấp 3 lần bình thường mà vẫn hiểu sâu",
        "Học để vượt qua kỳ thi vs Học để hiểu bản chất"
      ],
      English: [
        "The Harvard study method that beats 80% of students",
        "How to study 12 hours a day without mental burnout",
        "Remember 90% of what you read in just one pass",
        "Can you realistically learn a language in just 3 months?",
        "The Feynman Technique: how geniuses absorb learning",
        "Why studying more doesn't automatically make you smarter",
        "Active Recall vs Highlighting: which actually works?",
        "Pomodoro: the classic and ultimate focus hack",
        "Read books 3× faster without losing deep comprehension",
        "Studying for exams versus studying to understand deeply"
      ],
      Japanese: [
        "80%を圧倒するハーバード式勉強法",
        "1日12時間勉強しても燃え尽きないコツ",
        "一度読むだけで90%を脳に定着させる方法",
        "3ヶ月で新しい言語をマスターできるか？",
        "ファインマン・テクニック：天才の学習方法",
        "なぜ勉強しても賢くならないのか",
        "Active Recall vs ハイライト、本当に効くのは？",
        "ポモドーロ：定番にして最強の集中術",
        "本を3倍速で読み、深く理解する技術",
        "試験のための勉強と本質理解のための勉強"
      ]
    }
  }
];
