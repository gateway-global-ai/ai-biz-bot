import RoomCard from "../hotel/RoomCard";

export default function RoomCardExample() {
  const mockRoom = {
    id: "1",
    name: "Deluxe King Suite",
    description: "Spacious suite with king bed, full kitchen, and work desk. Perfect for extended stays.",
    maxGuests: 2,
    bedType: "King",
    sqft: 450,
    price: 129,
    amenities: ["Kitchen", "WiFi", "Workspace", "TV", "AC"],
  };

  return (
    <div className="max-w-sm">
      <RoomCard
        room={mockRoom}
        showRewardsPrice={true}
        onSelect={(room) => console.log("Selected:", room)}
      />
    </div>
  );
}
