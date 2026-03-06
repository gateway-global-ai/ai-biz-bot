import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import GroupBookingSection from "@/components/hotel/GroupBookingSection";

export default function Groups() {
  return (
    <div className="min-h-screen" data-testid="page-groups">
      <Header />
      <main className="pt-20">
        <section className="py-12 bg-primary text-white">
          <div className="max-w-7xl mx-auto px-4 md:px-6 text-center">
            <h1
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
              data-testid="text-groups-page-title"
            >
              Group Bookings
            </h1>
            <p className="text-white/90 text-lg max-w-2xl mx-auto">
              Special rates and dedicated service for groups of 10 or more rooms.
              Corporate events, sports teams, weddings, and family reunions welcome.
            </p>
          </div>
        </section>
        <GroupBookingSection />
      </main>
      <Footer />
    </div>
  );
}
