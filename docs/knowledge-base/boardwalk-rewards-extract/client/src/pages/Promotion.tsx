import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PromotionSection from "@/components/hotel/PromotionSection";

export default function Promotion() {
  return (
    <div className="min-h-screen" data-testid="page-promotion">
      <Header />
      <main className="pt-20">
        <PromotionSection />
      </main>
      <Footer />
    </div>
  );
}
