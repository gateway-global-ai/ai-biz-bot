import HeroSection from "../hotel/HeroSection";

export default function HeroSectionExample() {
  return (
    <HeroSection
      hotelName="Boardwalk Suites Lafayette"
      tagline="Your Home Away From Home"
      onSearch={(params) => console.log("Search:", params)}
    />
  );
}
