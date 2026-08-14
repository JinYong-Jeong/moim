import Link from "next/link";

export function LoginLanding() {
  return (
    <main className="login-page">
      <div className="login-orbit" aria-hidden="true">
        <span>🎮</span><span>🍜</span><span>🏃</span><span>🍻</span>
        <strong>같이?</strong>
      </div>
      <div className="login-copy">
        <span className="brand-kicker">FRIEND TASK</span>
        <h1>오늘 뭐 할 사람?</h1>
        <p>
          단톡에서 묻고 또 묻지 말고,
          <br />한 번에 모여요.
        </p>
      </div>
      <Link className="primary-button login-button" href="/signin-with-chatgpt?return_to=%2F">
        로그인하고 시작하기
      </Link>
      <p className="login-note">초대받은 친구만 들어올 수 있어요.</p>
    </main>
  );
}
