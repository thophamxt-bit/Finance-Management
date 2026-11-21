import { useEffect, useState } from "react";
import { groupSlides, initialTransactions } from "../../data/mockData";
import { formatMoney } from "../../utils/formatters";
import { Icon } from "../common/Icon";
import { Logo } from "../common/Logo";

import { useNavigate } from "react-router-dom";

export function Landing({ onStart }) {
  const navigate = useNavigate();
  const handleStart = onStart || (() => navigate("/dashboard"));
  const [groupSlide, setGroupSlide] = useState(0);
  const [showcaseTab, setShowcaseTab] = useState("dashboard");

  useEffect(() => {
    const timer = window.setInterval(
      () => setGroupSlide((current) => (current + 1) % groupSlides.length),
      4500
    );
    return () => window.clearInterval(timer);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="landing-wrapper">
      {/* ========================================================
          PHẦN 1: HERO SECTION & KHỐI BLOCK NGHIÊNG
          ======================================================== */}
      <section className="section-hero" id="home">
        <nav className="landing-nav">
          <Logo />
          <div className="nav-links">
            <button onClick={() => scrollTo("intro-problem")}>Giải pháp</button>
            <button onClick={() => scrollTo("jars-philosophy")}>Quy tắc 6 lọ</button>
            <button onClick={() => scrollTo("app-showcase")}>Giao diện</button>
            <button onClick={() => scrollTo("group-feature")}>Chi tiêu nhóm</button>
            <button onClick={() => scrollTo("why-temoney")}>Vì sao Temoney?</button>
          </div>
          <div className="nav-cta">
            <button className="text-button" onClick={handleStart}>
              Đăng nhập
            </button>
            <button className="pill-button small" onClick={handleStart}>
              Bắt đầu ngay
            </button>
          </div>
        </nav>

        <main className="hero">
          <div className="orb orb-one" />
          <div className="orb orb-two" />

          {/* CỘT TRÁI: TIÊU ĐỀ & KÊU GỌI HÀNH ĐỘNG */}
          <section className="hero-copy">
            <div className="kicker">
              <Icon name="sparkle" size={15} /> Tài chính nhẹ tênh, mỗi ngày
            </div>
            <h1 className="hero-title">
              Tiền bạc rõ ràng.<br />
              Cuộc sống <em>thảnh thơi.</em>
            </h1>
            <p>
              Temoney giúp bạn theo dõi chi tiêu, vun đắp tiết kiệm và hiểu dòng tiền của mình — theo cách thật đơn giản, dịu dàng.
            </p>
            <div className="hero-actions">
              <button className="pill-button" onClick={handleStart}>
                Bắt đầu quản lý <Icon name="arrow" size={18} />
              </button>
              <button className="play-button" onClick={() => scrollTo("app-showcase")}>
                <span>▶</span> Xem Temoney hoạt động
              </button>
            </div>

          </section>

          {/* CỘT PHẢI: CỬA SỔ CHỤP THỰC TẾ ỨNG DỤNG TEMONEY */}
          <section className="hero-visual" aria-label="Xem trước bảng điều khiển Temoney">
            {/* THẺ NỔI 1: TỔNG THU NHẬP */}
            <div className="float-card float-income">
              <span style={{ background: "#dcfce7", color: "#16a34a" }}>
                <Icon name="income" size={18} />
              </span>
              <div>
                <small>Tổng thu nhập</small>
                <b style={{ color: "#16a34a" }}>+7.500.000 VND</b>
              </div>
            </div>

            {/* CỬA SỔ APP MOCKUP CHỨA ẢNH CHỤP GIAO DIỆN THỰC TẾ */}
            <div className="hero-app-window">
              <div className="window-bar">
                <div className="window-dots">
                  <span className="dot red" />
                  <span className="dot yellow" />
                  <span className="dot green" />
                </div>
                <div className="window-address">
                  <span className="lock-icon">🔒</span> app.temoney.vn/dashboard
                </div>
                <div className="window-user">PhamDucTho</div>
              </div>
              <div className="window-body">
                <img
                  src="/demo-dashboard.png"
                  alt="Giao diện chính thức Temoney Dashboard"
                  className="window-img"
                />
              </div>
            </div>

            {/* THẺ NỔI 2: TỔNG CHI TIÊU */}
            <div className="float-expense-custom">
              <span>
                <Icon name="expense" size={18} />
              </span>
              <div>
                <small>Tổng chi tiêu</small>
                <b>-1.565.000 VND</b>
              </div>
            </div>

            {/* THẺ NỔI 3: TỔNG SỐ DƯ CÁC VÍ */}
            <div className="float-card float-saving">
              <span>💳</span>
              <div>
                <small>Tổng số dư các ví</small>
                <b style={{ color: "#ea580c" }}>25.935.000 VND</b>
                <i>
                  <u style={{ width: "85%", background: "#ea580c" }} />
                </i>
              </div>
            </div>

            {/* HUY HIỆU ĐỒNG TIỀN */}
            <div className="mascot">
              <span>₫</span>
              <i />
              <i />
            </div>
          </section>
        </main>
      </section>

      {/* ========================================================
          PHẦN 2: CÂU HỎI & VẤN ĐỀ TÀI CHÍNH
          ======================================================== */}
      <section className="section-problem" id="intro-problem">
        <div className="problem-container">
          <div className="problem-badge">GIẢI PHÁP TÀI CHÍNH THÔNG MINH</div>
          <h2 className="problem-heading">
            Bạn đang muốn quản lý tài chính?<br />
            <span>Cá nhân hoặc nhóm ?</span>
          </h2>
          <div className="problem-subheading">
            Tại sao kiếm được nhiều tiền vẫn không thấy giàu? 💸
          </div>
          <p className="problem-desc">
            Khám phá bí mật tư duy của các triệu phú và cách số hóa quản trị tài chính cá nhân bền vững cùng{" "}
            <strong>Temoney</strong>.
          </p>
        </div>
      </section>

      {/* ========================================================
          PHẦN 3: 4 TRỤ CỘT & QUY TẮC 6 CHIẾC LỌ JARS
          ======================================================== */}
      <section className="section-jars" id="jars-philosophy">
        <div className="jars-container">
          <div className="jars-grid">
            <article className="jar-card bg-white">
              <div className="jar-card-top">
                <div className="jar-badge amber">
                  <span>⚡</span> 1. NGUYÊN NHÂN
                </div>
                <h3>Bẫy "Cháy túi" & Tiêu hoang</h3>
                <p>
                  Đa số chúng ta rơi vào vòng xoáy <em>Rat Race</em>: Thu nhập tăng lên bao nhiêu, nhu cầu ăn uống mua sắm tăng bấy nhiêu (Lạm phát lối sống).
                </p>
              </div>
              <div className="jar-quote amber-quote">
                💡 "Vấn đề không phải bạn kiếm được bao nhiêu tiền, mà là bạn giữ lại được bao nhiêu!"
              </div>
            </article>

            <article className="jar-card bg-white">
              <div className="jar-card-top">
                <div className="jar-badge purple">
                  <span>📖</span> 2. LÝ DO & TRIẾT LÝ
                </div>
                <h3>Quy tắc 6 Chiếc Lọ (JARS)</h3>
                <p>
                  Doanh nhân <strong className="text-purple-700">T. Harv Eker</strong> (tác giả <em>Bí mật tư duy triệu phú</em>) khẳng định: Người giàu khác người nghèo ở <b>thói quen quản lý dòng tiền</b>.
                </p>
                <div className="jars-breakdown">
                  <div><span>🏺 <b>55%</b></span> Thiết yếu (NEC)</div>
                  <div><span>🔓 <b>10%</b></span> Tự do tài chính</div>
                  <div><span>🛡️ <b>10%</b></span> Tiết kiệm dài hạn</div>
                  <div><span>📚 <b>10%</b></span> Phát triển bản thân</div>
                  <div><span>🎮 <b>10%</b></span> Hưởng thụ (PLAY)</div>
                  <div><span>💖 <b>5%</b></span> Cho đi (GIVE)</div>
                </div>
              </div>
              <div className="jar-quote purple-quote">
                🎯 "Người giàu bắt tiền làm việc cho mình, người nghèo làm việc vì tiền!"
              </div>
            </article>

            <article className="jar-card featured-dark">
              <div className="jar-card-top">
                <div className="jar-badge dark-badge">
                  <span>🤖</span> 3. TEMONEY TRỢ GIÚP
                </div>
                <h3 className="text-white">Số Hóa 6 Lọ & AI Đồng Hành</h3>
                <p className="text-purple-100/90">
                  Temoney giúp bạn loại bỏ hoàn toàn việc chia phong bì giấy hay ghi chép sổ sách thủ công phiền toái:
                </p>
                <ul className="featured-features">
                  <li><span>✨</span> Tự động chia tỷ lệ 6 hũ ngay khi có thu nhập mới</li>
                  <li><span>🧠</span> Trợ lý AI phân tích phát hiện các khoản chi cảm xúc</li>
                  <li><span>🔔</span> Cảnh báo sớm nguy cơ thâm hụt ngân sách từng hũ</li>
                </ul>
              </div>
              <div className="jar-quote dark-quote">
                🚀 Tự động hóa kỷ luật dòng tiền ngay trong tầm tay
              </div>
            </article>

            <article className="jar-card bg-white">
              <div className="jar-card-top">
                <div className="jar-badge emerald">
                  <span>⏱️</span> 4. KẾT QUẢ ĐẠT ĐƯỢC
                </div>
                <h3>Tự Do & An Tâm Tuyệt Đối</h3>
                <p>
                  Người dùng Temoney đạt được sự chuyển hóa tài chính vượt trội sau 30 ngày áp dụng:
                </p>
                <ul className="result-checklist">
                  <li><span>✓</span> Nắm rõ 100% dòng tiền, không còn thất thoát bí ẩn</li>
                  <li><span>✓</span> Tích lũy vững chắc quỹ dự phòng và quỹ đầu tư</li>
                  <li><span>✓</span> Tâm trí an yên, tự tin trước mọi quyết định chi tiêu</li>
                </ul>
              </div>
              <div className="jar-quote emerald-quote">
                🌿 An tâm tài chính là nền tảng của cuộc sống thảnh thơi
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ========================================================
          PHẦN: TRẢI NGHIỆM GIAO DIỆN THỰC TẾ (APP SHOWCASE)
          ======================================================== */}
      <section className="section-showcase" id="app-showcase">
        <div className="showcase-container">
          <div className="section-heading">
            <div className="section-kicker">
              <Icon name="sparkle" size={13} /> Trải nghiệm sản phẩm thực tế
            </div>
            <h2 className="section-title">
              Giao diện trực quan, <em>tinh tế từng pixel.</em>
            </h2>
            <p>
              Khám phá không gian quản lý tài chính chuẩn mực của Temoney với tông màu cam ấm hiện đại, biểu đồ thời gian thực và tự động hóa toàn diện.
            </p>
          </div>

          <div className="showcase-tabs">
            <button
              className={`showcase-tab ${showcaseTab === "dashboard" ? "active" : ""}`}
              onClick={() => setShowcaseTab("dashboard")}
            >
              <span className="tab-icon">🏠</span>
              <div>
                <b>Trang chủ & Ví cá nhân</b>
                <small>3 Thẻ KPI con & Biểu đồ 12 tháng</small>
              </div>
            </button>

            <button
              className={`showcase-tab ${showcaseTab === "activity" ? "active" : ""}`}
              onClick={() => setShowcaseTab("activity")}
            >
              <span className="tab-icon">📅</span>
              <div>
                <b>Lịch sử giao dịch</b>
                <small>5 Bộ lọc ngày & Thống kê thu chi</small>
              </div>
            </button>

            <button
              className={`showcase-tab ${showcaseTab === "group" ? "active" : ""}`}
              onClick={() => setShowcaseTab("group")}
            >
              <span className="tab-icon">👥</span>
              <div>
                <b>Chi tiêu nhóm</b>
                <small>Chia bill tự động & Quét mã QR</small>
              </div>
            </button>
          </div>

          <div className="showcase-display">
            <div className="showcase-window">
              <div className="window-bar">
                <div className="window-dots">
                  <span className="dot red" />
                  <span className="dot yellow" />
                  <span className="dot green" />
                </div>
                <div className="window-address">
                  <span className="lock-icon">🔒</span> app.temoney.vn/{showcaseTab === "dashboard" ? "dashboard" : showcaseTab === "activity" ? "activity" : "group"}
                </div>
                <div className="window-tag">Giao diện chính thức</div>
              </div>
              <div className="showcase-img-wrap">
                <img
                  src={
                    showcaseTab === "dashboard"
                      ? "/demo-dashboard.png"
                      : showcaseTab === "activity"
                        ? "/demo-activity.png"
                        : "/demo-group.png"
                  }
                  alt={`Màn hình Temoney ${showcaseTab}`}
                  className="showcase-img"
                  key={showcaseTab}
                />
              </div>
            </div>

            <div className="showcase-caption">

              {showcaseTab === "activity" && (
                <span>
                  <strong>Lịch sử giao dịch thông minh:</strong> Bộ lọc 5 chế độ (<em>Tất cả, Hôm nay, Tháng này, Theo ngày, Theo tháng</em>), thanh chọn ngày linh hoạt và thanh pill thống kê Tổng thu / Tổng chi / Chênh lệch tức thì.
                </span>
              )}
              {showcaseTab === "group" && (
                <span>
                  <strong>Chi tiêu nhóm sòng phẳng:</strong> Tổng chi phí nhóm (<strong>650.000 VND</strong>), chia bill tự động theo người tham gia, thuật toán bù trừ công nợ tối ưu và tính năng kết bạn bằng mã QR.
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          PHẦN 4: CHI TIÊU NHÓM (TEMONEY GROUP)
          ======================================================== */}
      <section className="section-group" id="group-feature">
        <div className="section-heading">
          <div className="section-kicker"><span>NEW</span> Temoney Group</div>
          <h2 className="section-title">
            Đi cùng nhau, chia tiền<br />
            <em>chẳng còn đau đầu.</em>
          </h2>
          <p>
            Từ chuyến đi cuối tuần đến căn nhà chung — Temoney giữ mọi khoản góp minh bạch để cả nhóm chỉ cần tập trung tận hưởng niềm vui.
          </p>
        </div>

        <div className="group-carousel">
          <div className="carousel-copy" key={`copy-${groupSlide}`}>
            <div className="slide-count">0{groupSlide + 1} <i /> 03</div>
            <span className="slide-eyebrow">{groupSlides[groupSlide].eyebrow}</span>
            <h3 className="slide-title">{groupSlides[groupSlide].title}</h3>
            <p>{groupSlides[groupSlide].copy}</p>
            <div className="carousel-controls">
              {groupSlides.map((slide, index) => (
                <button
                  key={slide.title}
                  className={groupSlide === index ? "active" : ""}
                  onClick={() => setGroupSlide(index)}
                  aria-label={`Xem tính năng ${index + 1}`}
                >
                  <i />
                </button>
              ))}
            </div>
          </div>

          <div className={`group-phone ${groupSlides[groupSlide].tone}`} key={`phone-${groupSlide}`}>
            <div className="phone-top">
              <span>9:41</span>
              <i /><i /><i />
            </div>
            <div className="trip-head">
              <button>
                <Icon name="chevron" size={16} />
              </button>
              <div>
                <small>Nhóm chi tiêu</small>
                <b>Đà Lạt gọi tên 🌲</b>
              </div>
              <div className="trip-avatars">
                <span>AN</span>
                <span>MI</span>
                <span>+3</span>
              </div>
            </div>
            <div className="trip-card">
              <span>Chuyến đi 3 ngày 2 đêm</span>
              <b>8.460.000 ₫</b>
              <small>Tổng chi tiêu của 5 thành viên</small>
              <div className="trip-progress"><i /></div>
              <div className="trip-meta">
                <span>12 giao dịch</span>
                <span>75% ngân sách</span>
              </div>
            </div>
            <div className="group-expense-title">
              <b>Hoạt động gần đây</b>
              <span>Hôm nay</span>
            </div>
            <div className="featured-expense">
              <span>{groupSlides[groupSlide].icon}</span>
              <div>
                <b>{groupSlides[groupSlide].tag}</b>
                <small>An đã thanh toán · 5 người</small>
              </div>
              <strong>{groupSlides[groupSlide].amount}</strong>
            </div>
            <div className="member-split">
              <div><span className="member-avatar one">AN</span><small>An</small><b>Đã trả</b></div>
              <i />
              <div><span className="member-avatar two">MI</span><small>Minh</small><b>248k</b></div>
              <i />
              <div><span className="member-avatar three">LY</span><small>Ly</small><b>248k</b></div>
              <i />
              <div><span className="member-avatar four">KH</span><small>Khoa</small><b>248k</b></div>
            </div>
            <button className="split-button" onClick={handleStart}>
              <Icon name="sparkle" size={15} /> Chia khoản này cùng Temoney
            </button>
          </div>

          <div className="group-float paid">
            <span>✓</span>
            <div>
              <b>Minh vừa hoàn tiền</b>
              <small>+248.000 ₫ · ngay bây giờ</small>
            </div>
          </div>
          <div className="group-float memory">
            <span>📸</span>
            <div>
              <b>24 kỷ niệm</b>
              <small>Và không có khoản nợ nào</small>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          PHẦN 5: CHUYỆN QUEN THUỘC (THỰC TRẠNG)
          ======================================================== */}
      <section className="section-why" id="why-temoney">
        <div className="why-intro">
          <div className="section-kicker soft">Chuyện quen thuộc</div>
          <h2 className="section-title compact">
            Chuyến đi rất vui.<br />
            Cho đến khi cần <em>chia tiền.</em>
          </h2>
          <p>
            Những khoản nhỏ bị quên, hóa đơn nằm rải rác và chẳng ai muốn làm “kế toán trưởng” của hội bạn.
          </p>
          <div className="scribble-note">
            <span>98%</span> nhóm bạn từng mất thời gian vì chia tiền thủ công*
          </div>
        </div>
        <div className="reason-cards">
          <article className="reason-card coral-card">
            <span className="reason-number">01</span>
            <div className="reason-emoji">🧾</div>
            <h3 className="reason-title">Hóa đơn đi muôn nơi</h3>
            <p>Ảnh chụp trong album, số tiền trong ghi chú, ai trả thì nằm trong tin nhắn.</p>
            <small>“Ủa bữa đó ai trả tiền BBQ nhỉ?”</small>
          </article>
          <article className="reason-card yellow-card">
            <span className="reason-number">02</span>
            <div className="reason-emoji">🫣</div>
            <h3 className="reason-title">Ngại nhắc chuyện tiền</h3>
            <p>Khoản nhỏ cộng lại thành lớn, nhưng nhắn đòi bạn thân lại thấy khó xử.</p>
            <small>“Thôi để mai nhắc... rồi quên luôn.”</small>
          </article>
          <article className="reason-card lilac-card">
            <span className="reason-number">03</span>
            <div className="reason-emoji">🧮</div>
            <h3 className="reason-title">Tính mãi vẫn chưa xong</h3>
            <p>Người không uống bia, người về sớm — chia đều đôi khi lại chẳng công bằng.</p>
            <small>“Sao mình phải trả phần này ta?”</small>
          </article>
        </div>
      </section>

      {/* ========================================================
          PHẦN 6: 3 BƯỚC ĐƠN GIẢN & BANNER CTA
          ======================================================== */}
      <section className="section-solution" id="solutions">
        <div className="section-heading">
          <div className="section-kicker"><Icon name="sparkle" size={13} /> Nhẹ nhàng hơn cùng Temoney</div>
          <h2 className="section-title">
            Một ứng dụng thông minh.<br />
            Giải quyết <em>mọi chuyện tiền nong.</em>
          </h2>
          <p>Temoney tự động hóa phần khó, để bạn luôn an tâm tận hưởng cuộc sống.</p>
        </div>

        <div className="solution-steps">
          <article>
            <span className="step-icon">👥</span>
            <small>Bước 01</small>
            <b>Tạo nhóm hoặc ví cá nhân</b>
            <p>Khởi tạo chỉ trong 30 giây. Phân bổ tự động theo quy tắc 6 chiếc lọ.</p>
          </article>
          <div className="step-arrow"><Icon name="arrow" size={24} /></div>
          <article>
            <span className="step-icon">🧾</span>
            <small>Bước 02</small>
            <b>Ghi chi tiêu siêu tốc</b>
            <p>Chụp hóa đơn bằng AI OCR hoặc nhập nhanh. Temoney tự phân loại chuẩn xác.</p>
          </article>
          <div className="step-arrow"><Icon name="arrow" size={24} /></div>
          <article>
            <span className="step-icon">🪄</span>
            <small>Bước 03</small>
            <b>AI cân đối & báo cáo</b>
            <p>Tự động bù trừ công nợ, phân tích thói quen và cảnh báo bội chi kịp thời.</p>
          </article>
        </div>

        <div className="solution-cta">
          <div>
            <span>💎</span>
            <div>
              <b>Sẵn sàng làm chủ tài chính thông minh?</b>
              <small>Bắt đầu hành trình tự do tài chính ngay hôm nay, hoàn toàn miễn phí.</small>
            </div>
          </div>
          <button className="white-button" onClick={handleStart}>
            Bắt đầu ngay cùng Temoney <Icon name="arrow" size={17} />
          </button>
        </div>
      </section>

      {/* ========================================================
          PHẦN 7: FOOTER
          ======================================================== */}
      <footer className="landing-footer">
        <Logo />
        <p>Temoney — Tiền bạc rõ ràng. Cuộc sống thảnh thơi. © 2026</p>
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          Lên đầu trang ↑
        </button>
      </footer>
    </div>
  );
}
