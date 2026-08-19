export function Hero() {
  return (
    <section className="hero">
      <div className="hero-aurora" aria-hidden="true">
        <span className="blob blob-a" />
        <span className="blob blob-b" />
        <span className="blob blob-c" />
      </div>
      <div className="hero-grid" aria-hidden="true" />

      <div className="hero-inner">
        <div className="hero-content">
          <p className="hero-eyebrow">Live on X Layer Testnet</p>
          <h1 className="hero-title">
            Work gets paid the moment <span className="hero-accent">an AI agrees</span> it&apos;s done.
          </h1>
          <p className="hero-subtitle">
            Post a task and lock the reward in USDC. Once it&apos;s delivered, an AI oracle reads it
            against your spec and publishes a score on-chain. Good work releases automatically.
            Anything short gets flagged instead of paid.
          </p>

          <div className="hero-steps">
            <div className="hero-step">
              <div className="hero-step-num">01</div>
              <div className="hero-step-text">Post a task and lock the reward in escrow.</div>
            </div>
            <div className="hero-step">
              <div className="hero-step-num">02</div>
              <div className="hero-step-text">A worker submits the deliverable on-chain.</div>
            </div>
            <div className="hero-step">
              <div className="hero-step-num">03</div>
              <div className="hero-step-text">The AI scores it. Pay or flag, automatically.</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
