export const aiTools = [
  { id: "t2i", name: "Văn Sinh Tú", desc: "Tạo hình ảnh chất lượng cao bằng cách sử dụng mô tả văn bản.", icon: "image" },
  { id: "i2i", name: "Hình ảnh", desc: "Tải lên ảnh tham khảo và tạo các biến thể với cùng phong cách.", icon: "sparkles" },
  { id: "i2p", name: "Sản phẩm được tạo ra từ hình ảnh", desc: "Tạo ảnh nền trắng và ảnh sản phẩm chỉ với một cú nhấp chuột.", icon: "package" },
  { id: "t2v", name: "Video Văn Sinh", desc: "Tạo video ngắn từ kịch bản", icon: "play" },
  { id: "v2v", name: "Video sản xuất video", desc: "Biến đổi phong cách và chuyển động của các video hiện có", icon: "film" },
  { id: "ecom", name: "công cụ thương mại điện tử", desc: "Một bộ sưu tập các công cụ nhỏ như ghép ảnh chính và bố cục chi tiết sản phẩm.", icon: "layers" },
];

export const videoTemplates = [
  { id: "tpl1", name: "Khoa học phổ biến", desc: "Giải thích một hiện tượng khoa học bằng hình ảnh trực quan." },
  { id: "tpl2", name: "Phỏng vấn nhân vật", desc: "Dựng lại cuộc phỏng vấn dạng hỏi đáp, phong cách tài liệu." },
  { id: "tpl3", name: "Giới thiệu sản phẩm", desc: "Video ngắn quảng bá tính năng và lợi ích sản phẩm." },
  { id: "tpl4", name: "Kể chuyện lịch sử", desc: "Tường thuật một sự kiện hoặc nhân vật lịch sử." },
  { id: "tpl5", name: "Tóm tắt bài viết", desc: "Chuyển bài blog dài thành video dọc dễ xem." },
  { id: "tpl6", name: "Trống — tự viết kịch bản", desc: "Bắt đầu từ một trang trắng, tự viết toàn bộ kịch bản." },
];

export const styleTemplates = [
  { id: "s1", name: "Giới thiệu dự án mã nguồn mở", ratio: "9:16" },
  { id: "s2", name: "Những cảnh làm việc thực tế", ratio: "16:9" },
  { id: "s3", name: "Phỏng vấn & phát sóng trên đường phố", ratio: "9:16" },
  { id: "s4", name: "Bản demo trực tiếp trên máy tính", ratio: "16:9" },
  { id: "s5", name: "Hình ảnh và văn bản hiển thị dọc", ratio: "9:16" },
  { id: "s6", name: "Cảm giác như phim người đóng", ratio: "16:9" },
];

export const characterStyles = [
  { id: "real", name: "Hình ảnh thực tế", desc: "Kết cấu con người chân thực" },
  { id: "anime", name: "Nhân vật anime", desc: "Nhân vật Anime/Manga" },
  { id: "silhouette", name: "Hình bóng", desc: "Biểu hiện hình bóng trừu tượng" },
  { id: "none", name: "Không có nhân vật", desc: "Chỉ có cảnh thuần túy" },
];

export const voiceOptions = [
  { id: "v1", name: "Giọng nữ ấm áp — Kể chuyện", gender: "Giọng nữ" },
  { id: "v2", name: "Giọng nữ ngọt ngào — Tâm tình", gender: "Giọng nữ" },
  { id: "v3", name: "Giọng nữ vui tươi — Phong cách đô thị", gender: "Giọng nữ" },
  { id: "v4", name: "Minh — Giọng nam trầm ấm", gender: "Giọng nam" },
  { id: "v5", name: "An — Giọng nam trẻ trung", gender: "Giọng nam" },
];

export const assetCategories = ["Vai trò", "Bối cảnh", "Đạo cụ", "Âm sắc"] as const;
export const topUpAmounts = [50000, 100000, 200000, 500000, 1000000, 2000000];

export const toolDetails: Record<string, { id: string; intro: string; fields: Record<string, unknown>[]; submitLabel: string }> = {
  t2i: { id: "t2i", intro: "Mô tả hình ảnh bằng văn bản, chọn kích thước hình ảnh, và hình ảnh sẽ được tạo ra.", fields: [{ kind: "textarea", label: "Từ khóa", placeholder: "Hãy mô tả chủ thể, khung cảnh, ánh sáng và phong cách..." }, { kind: "textarea", label: "Từ gợi ý đảo ngược", placeholder: "Nội dung không mong muốn, chẳng hạn như văn bản, hình mờ, vd.", optional: true }, { kind: "chips", label: "Khung", options: ["1:1", "16:9", "9:16"] }], submitLabel: "phát ra" },
  i2i: { id: "i2i", intro: "Tải lên hình ảnh tham khảo và mô tả các bộ phận bạn muốn giữ lại hoặc thay đổi.", fields: [{ kind: "upload", label: "Hình ảnh tham khảo" }, { kind: "textarea", label: "Từ khóa", placeholder: "Giữ nguyên chủ đề chính, sau đó chuyển sang cảnh đêm mang phong cách điện ảnh…" }, { kind: "chips", label: "Sự tương đồng", options: ["Thấp", "ở giữa", "cao"] }], submitLabel: "phát ra" },
  i2p: { id: "i2p", intro: "Tải lên hình ảnh sản phẩm, chọn nền trắng, cảnh vật hoặc hình ảnh dài để hiển thị chi tiết sản phẩm.", fields: [{ kind: "upload", label: "Hình ảnh sản phẩm" }, { kind: "cards", label: "Loại đầu ra", options: [{ title: "Hình ảnh nền trắng" }, { title: "Sơ đồ cảnh" }, { title: "Xem chi tiết bằng hình ảnh dài." }] }, { kind: "textarea", label: "Mô tả bổ sung (tùy chọn)", optional: true }], submitLabel: "Tạo ảnh sản phẩm" },
  t2v: { id: "t2v", intro: "Sau khi điền đầy đủ kịch bản, một khung hình tĩnh sẽ được tạo ra trước, sau đó là một video ngắn (khoảng 1-3 phút) sẽ được tạo.", fields: [{ kind: "textarea", label: "Kịch bản video" }, { kind: "chips", label: "Khoảng thời gian", options: ["5 giây", "10 giây", "15 giây"] }, { kind: "chips", label: "Khung", options: ["16:9", "9:16"] }], submitLabel: "Tạo video" },
  v2v: { id: "v2v", intro: "Hãy tải lên video gốc hoặc khung hình đầu tiên, và mô tả phong cách và cường độ của chuyển động.", fields: [{ kind: "upload", label: "Video nguồn / Khung hình đầu tiên" }, { kind: "textarea", label: "Mô tả chuyển đổi" }, { kind: "chips", label: "Cường độ tập luyện", options: ["yếu đuối", "ở giữa", "mạnh mẽ"] }], submitLabel: "Bắt đầu chuyển đổi" },
  ecom: { id: "ecom", intro: "Bạn cần kết hợp ít nhất 2 hình ảnh; để tạo poster giới thiệu sản phẩm, bạn chỉ cần tải lên 1 hình ảnh sản phẩm.", fields: [{ kind: "chips", label: "bộ công cụ", options: ["Ghép ảnh chính", "Bố cục chi tiết", "Poster giới thiệu sản phẩm"] }, { kind: "upload", label: "hình ảnh" }, { kind: "textarea", label: "Mô tả các điểm nổi bật (có thể kèm poster hoặc không)", optional: true }], submitLabel: "Bắt đầu làm" },
};
