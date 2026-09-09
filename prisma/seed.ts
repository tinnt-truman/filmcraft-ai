// prisma/seed.ts — chuyển dữ liệu mẫu trong lib/mockData.ts thành dữ liệu
// thật trong DB, giữ nguyên tên/nội dung mẫu và giữ nguyên các ID đang được
// FE hardcode trong link (drama/1, video/336) để không phải đổi route FE.
//
// Chạy: npm run db:seed  (hoặc tự động sau `prisma migrate dev`)

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@filmcraft.local";
const DEMO_PASSWORD = "demo12345";
const ADMIN_EMAIL = "admin@filmcraft.local";
const ADMIN_PASSWORD = "admin12345";

async function main() {
  console.log("Seeding FilmCraft AI demo data...");

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      passwordHash,
      name: "Demo User",
      wallet: { create: { balance: 200_000, heldAmount: 0 } },
    },
  });
  console.log(`User: ${user.email} (id=${user.id}) — mật khẩu demo: ${DEMO_PASSWORD}`);

  const adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { role: "ADMIN" },
    create: {
      email: ADMIN_EMAIL,
      passwordHash: adminPasswordHash,
      name: "Admin",
      role: "ADMIN",
      wallet: { create: { balance: 0, heldAmount: 0 } },
    },
  });
  console.log(`Admin: ${admin.email} (id=${admin.id}) — mật khẩu admin: ${ADMIN_PASSWORD} — vào /admin`);

  // --- Drama projects (giữ id "1"/"2"/"3" như mockData để link cũ vẫn chạy) ---

  const dramaSeed = [
    {
      id: "1",
      title: "Ngọn Hải Đăng Cuối Cùng",
      coverGradient: "from-indigo-400 to-slate-700",
      status: "IN_PROGRESS" as const,
      synopsis:
        "Trên hòn đảo nhỏ Vareth, nơi thần biển cả và loài người từng giao ước, Lina — một cô gái giữ đèn hải đăng — phát hiện ra bí mật khiến cả hòn đảo chìm trong bóng tối suốt 100 năm...",
      style: "Hình ảnh chân thực, tông màu lạnh, không khí huyền bí",
      episodeCount: 12,
      summary: {
        storyGenre: "Huyền bí + thần thoại biển cả + chính kịch",
        targetAudience: "Đại chúng, yêu thích không khí huyền bí",
        coreHook: "Giao ước bị phá vỡ + bí mật 100 năm bị chôn giấu + sự hy sinh của người giữ đèn",
        logline: "Một người giữ đèn hải đăng phải đánh đổi tất cả để giữ cho ngọn lửa giao ước không bao giờ tắt.",
        fullSummary:
          "Trên hòn đảo nhỏ Vareth, nơi thần biển cả và loài người từng giao ước, Lina — cô gái giữ đèn hải đăng đời thứ ba — phát hiện cuốn nhật ký của người tiền nhiệm ngay trong đêm cơn bão bất thường ập tới. Một người lạ dạt vào bờ mang theo hình xăm trùng khớp hoa văn cổ trên tường hải đăng, hé lộ giao ước bị phá vỡ và cơn thịnh nộ của thần biển Ashka đang chờ đánh thức. Xuyên suốt 12 tập, Lina phải ghép lại sự thật về lời nguyền, đối mặt các phe phái tranh giành quyền kiểm soát ngọn đèn, và cuối cùng chấp nhận hy sinh để giữ ánh sáng không bao giờ tắt.",
        visualStyle: "Hình ảnh chân thực, tông màu lạnh, ánh sáng ngược nghịch, không khí huyền bí ven biển.",
      },
      characters: [
        {
          name: "Lina",
          characterType: "PROTAGONIST" as const,
          visualDescription:
            "Nữ, khoảng 20 tuổi, tóc đen dài buộc gọn, mặc áo khoác dạ màu xám tro, mang theo đèn dầu cũ. Ánh mắt kiên định nhưng thường thoáng lo âu.",
          coreTags: ["Người giữ đèn", "Kiên định", "Hy sinh"],
          background: "Đời thứ ba trong dòng họ giữ ngọn hải đăng Vareth, lớn lên một mình trên đảo sau khi cha mất tích.",
          personality: "Trầm tĩnh, trách nhiệm cao, giấu cảm xúc thật đằng sau vẻ ngoài điềm đạm.",
        },
        {
          name: "Ông Corvin",
          characterType: "SUPPORTING" as const,
          visualDescription:
            "Nam, khoảng 60 tuổi, râu bạc, dáng người gầy, luôn mặc áo len dày và đeo kính lão khi đọc nhật ký cũ.",
          coreTags: ["Người tiền nhiệm", "Bí ẩn", "Cố vấn"],
          background: "Người giữ đèn đời thứ hai, để lại cuốn nhật ký ghi chép về giao ước với thần biển.",
          personality: "Ít nói, hoài nghi, mang nhiều tội lỗi chưa nói ra.",
        },
        {
          name: "Thần Biển Ashka",
          characterType: "ANTAGONIST" as const,
          visualDescription:
            "Hình dáng bán-nhân, da xanh thẫm ánh vảy, mắt phát sáng màu hổ phách, xuất hiện cùng những cơn sóng dữ dội.",
          coreTags: ["Thần thoại", "Giao ước", "Thịnh nộ"],
          background: "Vị thần cai quản vùng biển quanh đảo Vareth, từng lập giao ước bảo hộ hòn đảo đổi lấy ngọn lửa không bao giờ tắt.",
          personality: "Cổ xưa, công bằng theo cách tàn khốc, coi trọng lời hứa hơn mạng sống con người.",
        },
      ],
    },
    {
      id: "2",
      title: "Quán Trọ Giữa Hai Thế Giới",
      coverGradient: "from-amber-400 to-rose-600",
      status: "DRAFT" as const,
      synopsis:
        "Một quán trọ nhỏ ven đường chỉ mở cửa lúc nửa đêm, phục vụ cho những vị khách không thuộc về thế giới này...",
      style: "Phong cách anime, ấm áp, giả tưởng nhẹ nhàng",
      episodeCount: 8,
      summary: {
        storyGenre: "Giả tưởng nhẹ nhàng + chữa lành",
        targetAudience: "Đại chúng, yêu thích không khí ấm áp",
        coreHook: "Quán trọ bí ẩn chỉ mở lúc nửa đêm, mỗi tập một vị khách với một câu chuyện dang dở",
        logline: "Một quán trọ ở ranh giới hai thế giới, nơi mỗi vị khách nửa đêm mang theo một điều ước chưa nói.",
        fullSummary:
          "Quán trọ nhỏ ven đường chỉ mở cửa lúc nửa đêm, phục vụ những vị khách không thuộc về thế giới này — hồn ma, thần linh nhỏ, hay đơn giản là người sống lạc đường. Chủ quán lặng lẽ lắng nghe từng câu chuyện, dần hé lộ bí mật của chính mình.",
        visualStyle: "Phong cách anime ấm áp, ánh đèn vàng, chi tiết ẩm thực tỉ mỉ.",
      },
      characters: [] as never[],
    },
    {
      id: "3",
      title: "Đế Chế Rồng Sắt",
      coverGradient: "from-emerald-500 to-teal-800",
      status: "COMPLETED" as const,
      synopsis:
        "Khi Đế chế Rồng Sắt sụp đổ, ba phe phái tranh giành báu vật cuối cùng có thể hồi sinh cả một nền văn minh đã mất.",
      style: "Sử thi, võ thuật, hình ảnh điện ảnh",
      episodeCount: 16,
      summary: {
        storyGenre: "Sử thi + võ thuật + tranh đoạt quyền lực",
        targetAudience: "Nam giới / đại chúng",
        coreHook: "Đế chế sụp đổ, ba phe tranh báu vật có thể hồi sinh văn minh đã mất",
        logline: "Khi đế chế sụp đổ, ba phe phái phải chọn giữa quyền lực và sự hồi sinh của cả một nền văn minh.",
        fullSummary:
          "Khi Đế chế Rồng Sắt sụp đổ sau cuộc nội chiến kéo dài, ba phe phái — tàn quân hoàng gia, liên minh thương nhân, và giáo phái cổ — cùng tranh giành báu vật cuối cùng có thể hồi sinh cả một nền văn minh đã mất. Xuyên suốt 16 tập, các nhân vật buộc phải chọn giữa tham vọng cá nhân và trách nhiệm với những gì còn sót lại.",
        visualStyle: "Sử thi, võ thuật, ánh sáng điện ảnh, gam màu kim loại.",
      },
      characters: [] as never[],
    },
  ];

  for (const d of dramaSeed) {
    await prisma.dramaProject.upsert({
      where: { id: d.id },
      update: {},
      create: {
        id: d.id,
        userId: user.id,
        title: d.title,
        coverGradient: d.coverGradient,
        status: d.status,
        summary: {
          create: {
            episodeCount: d.episodeCount,
            storyGenre: d.summary.storyGenre,
            targetAudience: d.summary.targetAudience,
            coreHook: d.summary.coreHook,
            logline: d.summary.logline,
            fullSummary: d.summary.fullSummary,
            visualStyle: d.summary.visualStyle,
          },
        },
        characters: { create: d.characters },
      },
    });
  }
  console.log(`Drama projects: ${dramaSeed.length}`);

  // --- Episodes (12 tập, gắn vào dự án "1" — đúng episodeCount trong mock) ---

  const episodeSeed = [
    { index: 1, title: "Tập 1", summary: "Cơn bão bất thường ập đến bờ biển phía Bắc." },
    { index: 2, title: "Tập 2", summary: "Lina tìm thấy cuốn nhật ký của người giữ đèn tiền nhiệm." },
    { index: 3, title: "Tập 3", summary: "Một người lạ dạt vào bờ, mang theo lời nguyền cổ xưa." },
    { index: 4, title: "Tập 4", summary: "Bí mật về giao ước với thần biển dần hé lộ." },
    { index: 5, title: "Tập 5", summary: "Cuộc rượt đuổi trên những vách đá dựng đứng." },
    { index: 6, title: "Tập 6", summary: "Kẻ thù trở thành đồng minh bất đắc dĩ." },
    { index: 7, title: "Tập 7", summary: "Dấu vết của ngọn hải đăng nguyên bản được tìm thấy." },
    { index: 8, title: "Tập 8", summary: "Thần biển thức giấc, cơn thịnh nộ nhấn chìm hòn đảo." },
    { index: 9, title: "Tập 9", summary: "Sự thật về lời nguyền khiến tất cả đảo lộn." },
    { index: 10, title: "Tập 10", summary: "Ba phe phái cùng tranh giành quyền kiểm soát ngọn đèn." },
    { index: 11, title: "Tập 11", summary: "Lina hy sinh thân mình để giữ ngọn lửa không tắt." },
    { index: 12, title: "Tập 12", summary: "Bình minh mới trên hòn đảo Vareth." },
  ];

  const episode1ScriptRaw = `### Cảnh 1-1
Đêm Ngoại Bờ biển phía Bắc・Chân ngọn hải đăng
Nhân vật xuất hiện: Lina
△ Toàn cảnh: Con bão bất thường kéo đến từ ngoài khơi, mây đen cuộn thành hình xoáy trên ngọn hải đăng Vareth.
△ Cận cảnh: Sóng lớn đập vào vách đá, nước bắn tung toé qua cả lớp kính cửa sổ hải đăng.
Lina (nhìn ra cửa sổ, giọng lo lắng): Đèn hải đăng chưa từng tắt một đêm nào suốt 100 năm... sao đêm nay lại chớp liên hồi thế này?
△ Đặc tả: Ngọn lửa trong đèn hải đăng run rẩy, ánh sáng đỏ bất thường lan ra trên mặt biển.

### Cảnh 1-2
Đêm Nội Cầu thang xoắn ốc hải đăng
Nhân vật xuất hiện: Lina
△ Trung cảnh: Lina chạy xuống cầu thang xoắn ốc bằng đá của hải đăng, tay ôm chặt cuốn nhật ký cũ.
Lina (tự nhủ, hơi thở gấp): Cuốn nhật ký này... của người giữ đèn trước mình. Có lẽ ông ấy biết chuyện gì đang xảy ra.
△ Đặc tả: Trang nhật ký mở ra, dòng chữ viết tay run rẩy: "Nếu ngọn lửa đổi màu, giao ước đã bị phá vỡ."

### Cảnh 1-3
Đêm Ngoại Bãi đá ven bờ
Nhân vật xuất hiện: Lina
△ Toàn cảnh: Ngoài bờ đá, một bóng người bất động nằm sấp giữa đám rong biển, sóng vẫn tiếp tục vỗ vào.
Lina (hét lên, chạy về phía bờ): Có người! Có người mắc kẹt ngoài bãi đá!
△ Cận cảnh: Lina quỳ xuống lật người lạ lại — trên cổ tay ông ta là một hình xăm giống hệt hoa văn trên tường hải đăng.
Lina (sững người): Hoa văn này... sao lại giống với thứ khắc trên tường phòng đèn?
`;

  for (const ep of episodeSeed) {
    await prisma.episode.upsert({
      where: { projectId_index: { projectId: "1", index: ep.index } },
      update: {},
      create: {
        projectId: "1",
        index: ep.index,
        title: ep.title,
        summary: ep.summary,
        scriptRaw:
          ep.index === 1
            ? episode1ScriptRaw
            : `### Cảnh ${ep.index}-1\nNgày Ngoại Đảo Vareth\nNhân vật xuất hiện: Lina\n△ Toàn cảnh: ${ep.summary}\nLina (giọng trầm tư): (kịch bản mẫu — dùng nút "Tái tạo" để AI sinh lại chi tiết hơn.)\n`,
      },
    });
  }
  console.log(`Episodes: ${episodeSeed.length}`);

  // --- Segments cho tập 1 (khớp editor cấp đoạn trong mockData.ts) --------

  const ep1 = await prisma.episode.findFirst({ where: { projectId: "1", index: 1 } });
  if (ep1) {
    const existingSegments = await prisma.segment.count({ where: { episodeId: ep1.id } });
    if (existingSegments === 0) {
      const segmentSeed = [
        {
          order: 1,
          title: "Đoạn 1",
          durationSec: 18,
          lines: [
            { order: 1, tag: "SUBTITLE_CONFIG" as const, durationSec: 0, text: "Phụ đề: căn giữa dưới · tiếng Việt · luân phiên theo câu · đồng bộ lời thoại" },
            { order: 2, tag: "BGM" as const, durationSec: 0, text: "Nhạc nền: sóng biển xa, dây kéo dài u tịch; âm lượng thấp hơn lời thoại" },
            { order: 3, tag: "VISUAL" as const, durationSec: 6, shotType: "Toàn cảnh", text: "Con bão bất thường kéo đến từ ngoài khơi, mây đen cuộn thành hình xoáy trên ngọn hải đăng Vareth." },
            { order: 4, tag: "VISUAL" as const, durationSec: 5, shotType: "Cận cảnh", text: "Sóng lớn đập vào vách đá, nước bắn tung toé qua cả lớp kính cửa sổ hải đăng." },
            { order: 5, tag: "DIALOGUE" as const, durationSec: 4, characterName: "Lina", direction: "nhìn ra cửa sổ, giọng lo lắng", text: "Đèn hải đăng chưa từng tắt một đêm nào suốt 100 năm... sao đêm nay lại chớp liên hồi thế này?" },
            { order: 6, tag: "VISUAL" as const, durationSec: 3, shotType: "Đặc tả", text: "Ngọn lửa trong đèn hải đăng run rẩy, ánh sáng đỏ bất thường lan ra trên mặt biển." },
          ],
        },
        {
          order: 2,
          title: "Đoạn 2",
          durationSec: 15,
          lines: [
            { order: 1, tag: "BGM" as const, durationSec: 0, text: "Nhạc nền: căng thẳng nhẹ, tiếng chuông xa vọng lại" },
            { order: 2, tag: "VISUAL" as const, durationSec: 5, shotType: "Trung cảnh", text: "Lina chạy xuống cầu thang xoắn ốc bằng đá của hải đăng, tay ôm chặt cuốn nhật ký cũ." },
            { order: 3, tag: "DIALOGUE" as const, durationSec: 4, characterName: "Lina", direction: "tự nhủ, hơi thở gấp", text: "Cuốn nhật ký này... của người giữ đèn trước mình. Có lẽ ông ấy biết chuyện gì đang xảy ra." },
            { order: 4, tag: "VISUAL" as const, durationSec: 6, shotType: "Đặc tả", text: "Trang nhật ký mở ra, dòng chữ viết tay run rẩy: \"Nếu ngọn lửa đổi màu, giao ước đã bị phá vỡ.\"" },
          ],
        },
        {
          order: 3,
          title: "Đoạn 3",
          durationSec: 20,
          lines: [
            { order: 1, tag: "BGM" as const, durationSec: 0, text: "Nhạc nền: hợp âm thấp, kéo dài, gợi cảm giác điềm báo" },
            { order: 2, tag: "VISUAL" as const, durationSec: 7, shotType: "Toàn cảnh", text: "Ngoài bờ đá, một bóng người bất động nằm sấp giữa đám rong biển, sóng vẫn tiếp tục vỗ vào." },
            { order: 3, tag: "DIALOGUE" as const, durationSec: 5, characterName: "Lina", direction: "hét lên, chạy về phía bờ", text: "Có người! Có người mắc kẹt ngoài bãi đá!" },
            { order: 4, tag: "VISUAL" as const, durationSec: 4, shotType: "Cận cảnh", text: "Lina quỳ xuống lật người lạ lại — trên cổ tay ông ta là một hình xăm giống hệt hoa văn trên tường hải đăng." },
            { order: 5, tag: "DIALOGUE" as const, durationSec: 4, characterName: "Lina", direction: "sững người", text: "Hoa văn này... sao lại giống với thứ khắc trên tường phòng đèn?" },
          ],
        },
      ];

      for (const seg of segmentSeed) {
        await prisma.segment.create({
          data: {
            episodeId: ep1.id,
            order: seg.order,
            title: seg.title,
            durationSec: seg.durationSec,
            status: "PENDING",
            lines: {
              create: seg.lines.map((l) => ({
                order: l.order,
                tag: l.tag,
                durationSec: l.durationSec,
                characterName: "characterName" in l ? l.characterName : null,
                direction: "direction" in l ? l.direction : null,
                shotType: "shotType" in l ? l.shotType : null,
                text: l.text,
              })),
            },
          },
        });
      }
      console.log(`Segments cho Tập 1: ${segmentSeed.length}`);
    }
  }

  // --- Assets (nhân vật đã tạo cho dự án "1") ------------------------------

  const assetSeed = [
    { name: "Lina", role: "Nhân vật chính", tag: "Hình ảnh thực tế" },
    { name: "Ông Corvin", role: "Người giữ đèn tiền nhiệm", tag: "Hình ảnh thực tế" },
    { name: "Thần Biển Ashka", role: "Phản diện / Thần thoại", tag: "Giả tưởng" },
  ];
  for (const a of assetSeed) {
    const exists = await prisma.asset.findFirst({
      where: { userId: user.id, projectId: "1", name: a.name, category: "CHARACTER" },
    });
    if (!exists) {
      await prisma.asset.create({
        data: {
          userId: user.id,
          projectId: "1",
          category: "CHARACTER",
          name: a.name,
          imageUrl: null,
          metadata: { role: a.role, tag: a.tag },
        },
      });
    }
  }
  console.log(`Assets: ${assetSeed.length}`);

  // --- Video projects (giữ id "336"/"337" như mockData) -------------------

  const videoSeed = [
    {
      id: "336",
      title: "Sự hình thành của lỗ đen: Từ ngôi sao đến hố đen",
      status: "DRAFT" as const,
      templateId: "tpl1",
      topic: "Sự hình thành của lỗ đen: từ các ngôi sao đến những cạm bẫy không thời gian.",
      durationRange: "1-3",
      audience: "Học sinh trung học cơ sở",
      visualStyleId: "s6",
      characterStyleId: "real",
      voiceId: "v2",
      ratio: "16:9",
    },
    {
      id: "337",
      title: "Vì sao san hô đang biến mất?",
      status: "COMPLETED" as const,
      templateId: "tpl2",
      topic: "Vì sao các rạn san hô trên thế giới đang biến mất và điều đó ảnh hưởng gì đến đại dương.",
      durationRange: "3-5",
      audience: "Người đi làm / đại chúng",
      visualStyleId: "s3",
      characterStyleId: "real",
      voiceId: "v1",
      ratio: "9:16",
    },
  ];

  const scenesSample = [
    { order: 1, title: "Cảnh mở đầu", description: "Toàn cảnh chủ đề, câu hỏi dẫn dắt người xem.", startSec: 0, endSec: 8 },
    { order: 2, title: "Bối cảnh", description: "Giải thích bối cảnh / định nghĩa cơ bản.", startSec: 8, endSec: 20 },
    { order: 3, title: "Diễn biến chính", description: "Đi sâu vào nội dung chính, minh hoạ bằng hình ảnh động.", startSec: 20, endSec: 45 },
    { order: 4, title: "Cao trào", description: "Điểm nhấn thú vị nhất hoặc bất ngờ nhất của chủ đề.", startSec: 45, endSec: 55 },
    { order: 5, title: "Kết luận", description: "Tóm tắt ngắn gọn và lời kêu gọi hành động.", startSec: 55, endSec: 65 },
  ];

  for (const v of videoSeed) {
    await prisma.videoProject.upsert({
      where: { id: v.id },
      update: {},
      create: {
        id: v.id,
        userId: user.id,
        title: v.title,
        status: v.status,
        templateId: v.templateId,
        topic: v.topic,
        durationRange: v.durationRange,
        audience: v.audience,
        visualStyleId: v.visualStyleId,
        characterStyleId: v.characterStyleId,
        voiceId: v.voiceId,
        ratio: v.ratio,
        scenes: v.status === "COMPLETED" ? { create: scenesSample } : undefined,
      },
    });
  }
  console.log(`Video projects: ${videoSeed.length}`);

  console.log("Seed hoàn tất.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
