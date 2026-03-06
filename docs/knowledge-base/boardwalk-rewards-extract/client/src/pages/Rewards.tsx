import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import RewardsPage from "@/components/hotel/RewardsPage";

export default function Rewards() {
  return (
    <div className="min-h-screen" data-testid="page-rewards">
      <Header />
      <main>
        <RewardsPage />
      </main>
      <Footer />
    </div>
  );
}
