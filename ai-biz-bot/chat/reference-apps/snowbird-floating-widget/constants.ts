
import { TravelPackage, LocationType } from './types';

export const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyDa0EJi3hZBAKKJT61aCD9Qn3bSLO-DVro'; 

// Approximate coordinates for key locations
const COORDS = {
  MILAN_DUOMO: { lat: 45.4642, lng: 9.1900 },
  MILAN_SAN_SIRO: { lat: 45.4781, lng: 9.1240 },
  MILAN_MALPENSA: { lat: 45.6301, lng: 8.7255 },
  MILAN_FORUM: { lat: 45.4021, lng: 9.1458 },
  BORMIO_CENTER: { lat: 46.4684, lng: 10.3723 },
  BORMIO_STELVIO: { lat: 46.4600, lng: 10.3800 }, 
  LIVIGNO: { lat: 46.5386, lng: 10.1357 },
  CORTINA: { lat: 46.5405, lng: 12.1357 },
  PREDAZZO: { lat: 46.3129, lng: 11.6010 },
  TESERO: { lat: 46.2890, lng: 11.5120 },
  ANTERSELVA: { lat: 46.8534, lng: 12.1158 },
  VERONA_ARENA: { lat: 45.4390, lng: 10.9944 },
  VENICE_MESTRE: { lat: 45.4827, lng: 12.2378 },
  VENICE_ISLAND: { lat: 45.4344, lng: 12.3388 },
  TRENTO: { lat: 46.0697, lng: 11.1211 },
};

export const PACKAGES: TravelPackage[] = [
  {
    id: 'pkg1',
    name: 'Opening Ceremony & Alpine Week',
    tagline: '7 Days | Milan to Dolomites',
    description: 'Start with the grand Opening Ceremony in Milan and traverse Northern Italy through Bormio, Cortina, and Val di Fiemme.',
    duration: '7 Days',
    primaryColor: 'blue',
    days: [
      {
        dayNumber: 1,
        date: 'Fri Feb 6, 2026',
        title: 'Arrival & Opening Ceremony',
        description: 'Fly into Milan, explore the city center, and attend the Opening Ceremony at San Siro.',
        hackTip: 'Flying out on a weekday (Thursday) for return can lower fares significantly.',
        pois: [
            { 
              id: 'p1d1-1', 
              name: 'Milan Malpensa (MXP)', 
              type: LocationType.TRANSPORT, 
              description: 'Arrival and transfer via Malpensa Express.', 
              coordinates: COORDS.MILAN_MALPENSA,
              imageUrl: 'https://images.unsplash.com/photo-1569629743817-70d8db6c323b?auto=format&fit=crop&w=600&q=80',
              summary: 'The main international airport serving Milan, offering direct express train connections to the city center.',
              time: '10:30 AM',
              duration: '45m Transfer',
              price: 850,
              currency: 'USD'
            },
            { 
              id: 'p1d1-2', 
              name: 'Giacomo Arengario', 
              type: LocationType.DINING, 
              description: 'Seafood & Milanese classics with Duomo views.', 
              coordinates: COORDS.MILAN_DUOMO, 
              rating: '4.6', 
              reviews: 890,
              imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=600&q=80',
              summary: 'Refined restaurant located in the Museo del Novecento offering spectacular views of the Duomo spires.',
              time: '13:00',
              duration: '1h 30m',
              price: 120,
              currency: 'EUR'
            },
            { 
              id: 'p1d1-3', 
              name: 'Sheraton Milan San Siro', 
              type: LocationType.HOTEL, 
              description: '4-star hotel conveniently close to the stadium.', 
              coordinates: { lat: 45.4790, lng: 9.1250 }, 
              rating: '4.5', 
              reviews: 1204,
              imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80',
              summary: 'Modern upscale hotel set in a green area, featuring an Argentinean steakhouse, a pool & a 24/7 gym.',
              time: 'Check-in: 15:00',
              duration: '1 Night',
              price: 320,
              currency: 'EUR'
            },
            { 
              id: 'p1d1-4', 
              name: 'San Siro Stadium', 
              type: LocationType.EVENT, 
              description: 'Opening Ceremony starts ~8 PM.', 
              coordinates: COORDS.MILAN_SAN_SIRO,
              imageUrl: 'https://images.unsplash.com/photo-1522770179533-24471fcdba45?auto=format&fit=crop&w=600&q=80',
              summary: 'The Giuseppe Meazza Stadium, commonly known as San Siro, is a football stadium in the San Siro district of Milan.',
              time: '20:00',
              duration: '3h 30m',
              price: 500,
              currency: 'EUR'
            },
        ]
      },
      {
        dayNumber: 2,
        date: 'Sat Feb 7, 2026',
        title: 'Bormio Men’s Downhill',
        description: 'Early train to the Alps to witness the Men’s Downhill final on the legendary Stelvio slope.',
        pois: [
            { 
              id: 'p1d2-1', 
              name: 'Stelvio Slope', 
              type: LocationType.EVENT, 
              description: 'Men’s Downhill Alpine Skiing Final.', 
              coordinates: COORDS.BORMIO_STELVIO,
              imageUrl: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?auto=format&fit=crop&w=600&q=80',
              summary: 'One of the most technically difficult and tiring classic courses in the World Cup circuit.',
              time: '11:00 AM',
              duration: '2h',
              price: 150,
              currency: 'EUR'
            },
            { 
              id: 'p1d2-2', 
              name: 'Ristorante Al Filo', 
              type: LocationType.DINING, 
              description: 'Famous for Pizzoccheri pasta.', 
              coordinates: COORDS.BORMIO_CENTER, 
              rating: '4.4', 
              reviews: 350,
              imageUrl: 'https://images.unsplash.com/photo-1626804475297-411dbe6314c9?auto=format&fit=crop&w=600&q=80',
              summary: 'A cozy stone-walled venue serving creative takes on traditional Valtellina dishes like sciatt and pizzoccheri.',
              time: '13:30',
              duration: '1h',
              price: 45,
              currency: 'EUR'
            },
            { 
              id: 'p1d2-3', 
              name: 'Hotel Rezia Bormio', 
              type: LocationType.HOTEL, 
              description: 'Near Bormio thermal spa.', 
              coordinates: {lat: 46.4690, lng: 10.3730}, 
              rating: '4.0',
              reviews: 210,
              imageUrl: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=600&q=80',
              summary: 'Alpine-style hotel offering rustic-chic rooms, a restaurant & a bar, plus a spa with a sauna.',
              time: 'Check-in: 16:00',
              duration: '1 Night',
              price: 210,
              currency: 'EUR'
            },
            {
              id: 'p1d2-4',
              name: 'Enoteca Guanella',
              type: LocationType.DINING,
              description: 'Top-rated Valtellina specialties.',
              coordinates: { lat: 46.4670, lng: 10.3740 },
              rating: '4.5',
              reviews: 180,
              imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=600&q=80',
              summary: 'A renowned wine bar and restaurant offering an extensive selection of local wines and cured meats.',
              time: '19:30',
              duration: '2h',
              price: 60,
              currency: 'EUR'
            }
        ]
      },
      {
        dayNumber: 3,
        date: 'Sun Feb 8, 2026',
        title: 'Cortina Women’s Downhill',
        description: 'Scenic transfer to Cortina d’Ampezzo for the Women’s Downhill events.',
        pois: [
            { 
              id: 'p1d3-1', 
              name: 'Hotel de la Poste', 
              type: LocationType.HOTEL, 
              description: 'Historic 4-star in Cortina center.', 
              coordinates: COORDS.CORTINA,
              rating: '4.3',
              reviews: 405,
              imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80',
              summary: 'A historic institution in Cortina since 1835, frequented by writers like Hemingway.',
              price: 450,
              currency: 'EUR'
            },
            { 
              id: 'p1d3-2', 
              name: 'Tofane Alpine Centre', 
              type: LocationType.EVENT, 
              description: 'Women’s Downhill Final.', 
              coordinates: { lat: 46.5450, lng: 12.1100 },
              imageUrl: 'https://images.unsplash.com/photo-1486496146582-9ffcd0b2b2b7?auto=format&fit=crop&w=600&q=80',
              summary: 'Set against the dramatic backdrop of the Dolomites, Tofane hosts world-class speed events.',
              price: 120,
              currency: 'EUR'
            },
            {
              id: 'p1d3-3',
              name: 'Rifugio Col Druscié',
              type: LocationType.DINING,
              description: 'Lunch with panoramic views.',
              coordinates: { lat: 46.5510, lng: 12.1220 },
              rating: '4.5',
              reviews: 220,
              imageUrl: 'https://images.unsplash.com/photo-1596541539207-619f71c4c11e?auto=format&fit=crop&w=600&q=80',
              summary: 'Mountain hut offering gourmet dining at high altitude with breathtaking views of the Ampezzo valley.',
              price: 55,
              currency: 'EUR'
            },
            { 
              id: 'p1d3-4', 
              name: 'Il Vizietto di Cortina', 
              type: LocationType.DINING, 
              description: 'Casunziei all’Ampezzana specialty.', 
              coordinates: { lat: 46.5380, lng: 12.1360 }, 
              rating: '4.4',
              reviews: 620,
              imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
              summary: 'Contemporary bistro serving seasonal Italian fare & local wines in a warm, wood-paneled space.',
              price: 80,
              currency: 'EUR'
            },
        ]
      },
      {
        dayNumber: 4,
        date: 'Mon Feb 9, 2026',
        title: 'Predazzo Ski Jumping',
        description: 'Travel to Val di Fiemme for Men’s Normal Hill Ski Jump under floodlights.',
        pois: [
            { 
              id: 'p1d4-1', 
              name: 'Ancora Hotel Predazzo', 
              type: LocationType.HOTEL, 
              description: 'Known for warm hospitality.', 
              coordinates: COORDS.PREDAZZO,
              rating: '4.6',
              reviews: 330,
              imageUrl: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=600&q=80',
              summary: 'Charming 4-star hotel in the Fiemme Valley, featuring a wellness center and traditional restaurant.',
              price: 180,
              currency: 'EUR'
            },
            { 
              id: 'p1d4-2', 
              name: 'Stadio del Trampolino', 
              type: LocationType.EVENT, 
              description: 'Ski Jumping Final.', 
              coordinates: { lat: 46.3200, lng: 11.6100 },
              imageUrl: 'https://images.unsplash.com/photo-1547623642-1205169a531e?auto=format&fit=crop&w=600&q=80',
              summary: 'The Ski Jumping Stadium Giuseppe Dal Ben is a ski jumping venue in Predazzo, Val di Fiemme.',
              price: 90,
              currency: 'EUR'
            },
            {
              id: 'p1d4-3',
              name: 'Ristorante Miola',
              type: LocationType.DINING, 
              description: 'Local Trentino dishes.',
              coordinates: { lat: 46.3150, lng: 11.6050 },
              rating: '4.5',
              reviews: 150,
              imageUrl: 'https://images.unsplash.com/photo-1592861956120-e524fc739696?auto=format&fit=crop&w=600&q=80',
              summary: 'A refined restaurant offering traditional cuisine interpreted with modern flair, known for game and mushrooms.',
              price: 50,
              currency: 'EUR'
            }
        ]
      },
      {
        dayNumber: 5,
        date: 'Tue Feb 10, 2026',
        title: 'Tesero & South Tyrol',
        description: 'Cross-country skiing sprints then transfer to South Tyrol.',
        pois: [
             { 
               id: 'p1d5-1', 
               name: 'Lago di Tesero', 
               type: LocationType.EVENT, 
               description: 'Cross-Country Skiing Sprint Finals.', 
               coordinates: COORDS.TESERO,
               imageUrl: 'https://images.unsplash.com/photo-1518090384661-0f4675545588?auto=format&fit=crop&w=600&q=80',
               summary: 'A purpose-built cross-country stadium hosting world championship events and the Olympics.',
               price: 80,
               currency: 'EUR'
             },
             { 
               id: 'p1d5-2', 
               name: 'Biathlon Area Hotel', 
               type: LocationType.HOTEL, 
               description: 'Near Anterselva arena.', 
               coordinates: COORDS.ANTERSELVA,
               rating: '4.2',
               reviews: 150,
               imageUrl: 'https://images.unsplash.com/photo-1571896349842-68c47eb17998?auto=format&fit=crop&w=600&q=80',
               summary: 'Convenient lodging located just minutes from the world-famous Biathlon arena.',
               price: 240,
               currency: 'EUR'
             },
             {
               id: 'p1d5-3',
               name: 'Malga Antholz',
               type: LocationType.DINING,
               description: 'Tyrolean-Italian fusion.',
               coordinates: { lat: 46.8650, lng: 12.1250 },
               rating: '4.7',
               reviews: 90,
               imageUrl: 'https://images.unsplash.com/photo-1595295333158-4742f28fbd85?auto=format&fit=crop&w=600&q=80',
               summary: 'Rustic alpine hut serving hearty dumplings, polenta, and apple strudel in a cozy atmosphere.',
               price: 35,
               currency: 'EUR'
             }
        ]
      },
      {
        dayNumber: 6,
        date: 'Wed Feb 11, 2026',
        title: 'Biathlon & Ice Dance',
        description: 'Biathlon individual event then back to Milan for Ice Dancing.',
        pois: [
            { 
              id: 'p1d6-1', 
              name: 'Sudtirol Arena', 
              type: LocationType.EVENT, 
              description: 'Men’s 20km Biathlon.', 
              coordinates: COORDS.ANTERSELVA,
              imageUrl: 'https://images.unsplash.com/photo-1551524559-8af4e6624178?auto=format&fit=crop&w=600&q=80',
              summary: 'Set in the Antholz Valley, this is one of the most beautiful biathlon venues in the world.',
              price: 110,
              currency: 'EUR'
            },
            { 
              id: 'p1d6-2', 
              name: 'NH Milano Congress', 
              type: LocationType.HOTEL, 
              description: 'Walking distance to Forum.', 
              coordinates: { lat: 45.4030, lng: 9.1460 },
              rating: '4.1',
              reviews: 1100,
              imageUrl: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=600&q=80',
              summary: 'Large, modern business hotel situated directly opposite the Mediolanum Forum and Assago metro.',
              price: 215,
              currency: 'EUR'
            },
            { 
              id: 'p1d6-3', 
              name: 'Mediolanum Forum', 
              type: LocationType.EVENT, 
              description: 'Ice Dance Free Program.', 
              coordinates: COORDS.MILAN_FORUM,
              imageUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=600&q=80',
              summary: 'An indoor sports arena located in Assago, near Milan, hosting major concerts and sporting events.',
              price: 180,
              currency: 'EUR'
            },
            {
               id: 'p1d6-4',
               name: 'Navigli District',
               type: LocationType.SIGHTSEEING,
               description: 'Evening Aperitivo.',
               coordinates: { lat: 45.4500, lng: 9.1700 },
               imageUrl: 'https://images.unsplash.com/photo-1543269664-7eef42226a21?auto=format&fit=crop&w=600&q=80',
               summary: 'The historic canal district of Milan, vibrant with bars, restaurants, and art galleries.',
               price: 40,
               currency: 'EUR'
            }
        ]
      },
       {
        dayNumber: 7,
        date: 'Thu Feb 12, 2026',
        title: 'Milan Farewell',
        description: 'Sightseeing, shopping, and departure.',
        pois: [
            { 
              id: 'p1d7-1', 
              name: 'Pasticceria Marchesi', 
              type: LocationType.DINING, 
              description: 'Historic bakery breakfast.', 
              coordinates: COORDS.MILAN_DUOMO,
              rating: '4.5',
              reviews: 2200,
              imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
              summary: 'One of Milan’s oldest and finest pastry shops, famous for its panettone and elegant interiors.',
              price: 25,
              currency: 'EUR'
            },
            {
              id: 'p1d7-2',
              name: 'Via Montenapoleone',
              type: LocationType.SIGHTSEEING,
              description: 'Luxury shopping.',
              coordinates: { lat: 45.4690, lng: 9.1950 },
              imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80',
              summary: 'One of the world’s most famous and expensive shopping streets, heart of the Milan Fashion District.',
              price: 0,
              currency: 'EUR'
            },
            {
              id: 'p1d7-3',
              name: 'Trattoria Milanese',
              type: LocationType.DINING,
              description: 'Farewell lunch (Ossobuco).',
              coordinates: { lat: 45.4610, lng: 9.1780 },
              rating: '4.4',
              reviews: 1100,
              imageUrl: 'https://images.unsplash.com/photo-1594910620027-e85d1d64350c?auto=format&fit=crop&w=600&q=80',
              summary: 'A classic Milanese restaurant serving traditional dishes like saffron risotto and ossobuco since 1933.',
              price: 65,
              currency: 'EUR'
            },
            { 
              id: 'p1d7-4', 
              name: 'Milan Malpensa (MXP)', 
              type: LocationType.TRANSPORT, 
              description: 'Evening flight home.', 
              coordinates: COORDS.MILAN_MALPENSA,
              imageUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=600&q=80',
              summary: 'Departing from Terminal 1, utilizing the efficient express trains to reach the gate.',
              price: 850,
              currency: 'USD'
            },
        ]
      }
    ]
  },
  {
    id: 'pkg2',
    name: 'Closing Ceremony & Finale',
    tagline: '7 Days | Milan, Livigno, Verona',
    description: 'Catch the final gold medal events and celebrate at the Closing Ceremony in the historic Verona Arena.',
    duration: '7 Days',
    primaryColor: 'rose',
    days: [
      {
        dayNumber: 1,
        date: 'Mon Feb 16, 2026',
        title: 'Milan to Bormio',
        description: 'Arrive Milan, transfer to Bormio for Men’s Slalom.',
        pois: [
            { 
              id: 'p2d1-1', 
              name: 'Stelvio Slope', 
              type: LocationType.EVENT, 
              description: 'Men’s Slalom Finals.', 
              coordinates: COORDS.BORMIO_STELVIO,
              imageUrl: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?auto=format&fit=crop&w=600&q=80',
              summary: 'Experience the technical precision of slalom skiing on one of the steepest courses in the world.',
              price: 150,
              currency: 'EUR'
            },
            { 
              id: 'p2d1-2', 
              name: 'QC Grand Hotel Bagni Nuovi', 
              type: LocationType.HOTEL, 
              description: 'Historic spa hotel.', 
              coordinates: { lat: 46.4800, lng: 10.3600 }, 
              rating: '4.8',
              reviews: 1540,
              imageUrl: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=600&q=80',
              summary: 'A luxury Art Nouveau hotel in the Stelvio National Park, famous for its extensive thermal baths.',
              price: 420,
              currency: 'EUR'
            },
        ]
      },
      {
        dayNumber: 2,
        date: 'Tue Feb 17, 2026',
        title: 'Livigno Snowboarding',
        description: 'Visit the duty-free zone of Livigno for Women’s Slopestyle.',
        pois: [
            { 
              id: 'p2d2-1', 
              name: 'Livigno Snow Park', 
              type: LocationType.EVENT, 
              description: 'Women’s Snowboard Slopestyle.', 
              coordinates: COORDS.LIVIGNO,
              imageUrl: 'https://images.unsplash.com/photo-1521405924084-2d927d1a932d?auto=format&fit=crop&w=600&q=80',
              summary: 'One of the best snow parks in Europe, hosting freestyle skiing and snowboarding competitions.',
              price: 90,
              currency: 'EUR'
            },
            { 
              id: 'p2d2-2', 
              name: 'Hotel Lac Salin', 
              type: LocationType.HOTEL, 
              description: 'Spa & Mountain Resort.', 
              coordinates: COORDS.LIVIGNO,
              rating: '4.5',
              reviews: 420,
              imageUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=80',
              summary: 'A 4-star superior hotel featuring a 10,000 sq ft spa, located right on the slopes of Livigno.',
              price: 380,
              currency: 'EUR'
            },
        ]
      },
      {
        dayNumber: 3,
        date: 'Wed Feb 18, 2026',
        title: 'Cortina Slalom',
        description: 'Transfer to Cortina for Women’s Slalom finals.',
        pois: [
            { 
              id: 'p2d3-1', 
              name: 'Tofane Alpine Centre', 
              type: LocationType.EVENT, 
              description: 'Women’s Slalom Final.', 
              coordinates: { lat: 46.5450, lng: 12.1100 },
              imageUrl: 'https://images.unsplash.com/photo-1486496146582-9ffcd0b2b2b7?auto=format&fit=crop&w=600&q=80',
              summary: 'Watch the world’s best female skiers navigate the gates in the shadow of the Tofane massif.',
              price: 130,
              currency: 'EUR'
            },
            { 
              id: 'p2d3-2', 
              name: 'Hotel Alaska Cortina', 
              type: LocationType.HOTEL, 
              description: 'Central 4-star.', 
              coordinates: COORDS.CORTINA,
              rating: '4.2',
              reviews: 800,
              imageUrl: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=600&q=80',
              summary: 'A majestic hotel located in the heart of Cortina d’Ampezzo, steps from the exclusive shopping street.',
              price: 290,
              currency: 'EUR'
            },
            { 
              id: 'p2d3-3', 
              name: 'Ristorante Tivoli', 
              type: LocationType.DINING, 
              description: 'Alpine gourmet cuisine.', 
              coordinates: COORDS.CORTINA, 
              rating: '4.6',
              reviews: 310,
              imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=600&q=80',
              summary: 'Michelin-starred dining in a rustic mountain chalet, offering creative dishes using local ingredients.',
              price: 150,
              currency: 'EUR'
            },
        ]
      },
      {
        dayNumber: 4,
        date: 'Thu Feb 19, 2026',
        title: 'Milan Figure Skating',
        description: 'High-speed train to Milan for Women’s Figure Skating Final.',
        pois: [
            { 
              id: 'p2d4-1', 
              name: 'Ice Arena Milan', 
              type: LocationType.EVENT, 
              description: 'Women’s Free Program.', 
              coordinates: COORDS.MILAN_FORUM,
              imageUrl: 'https://images.unsplash.com/photo-1516283935213-92f7dc78887e?auto=format&fit=crop&w=600&q=80',
              summary: 'Witness the grace and athleticism of the figure skating finals in Milan’s premier ice venue.',
              price: 220,
              currency: 'EUR'
            },
            { 
              id: 'p2d4-2', 
              name: 'Starhotels Business Palace', 
              type: LocationType.HOTEL, 
              description: 'Near metro and arena.', 
              coordinates: { lat: 45.4400, lng: 9.2300 },
              rating: '4.3',
              reviews: 950,
              imageUrl: 'https://images.unsplash.com/photo-1551918120-9739cb747127?auto=format&fit=crop&w=600&q=80',
              summary: 'A loft-style 4-star hotel in a converted industrial building, offering spacious rooms and a gym.',
              price: 180,
              currency: 'EUR'
            },
        ]
      },
      {
        dayNumber: 5,
        date: 'Fri Feb 20, 2026',
        title: 'Hockey Semifinals',
        description: 'Explore Milan and watch Men’s Hockey Semifinal.',
        hackTip: 'Staying 2 nights in Milan captures loyalty perks and reduces packing.',
        pois: [
            { 
              id: 'p2d5-1', 
              name: 'Hockey Arena', 
              type: LocationType.EVENT, 
              description: 'Men’s Ice Hockey Semifinal.', 
              coordinates: { lat: 45.4050, lng: 9.1500 },
              imageUrl: 'https://images.unsplash.com/photo-1515703407324-5f753afd8be8?auto=format&fit=crop&w=600&q=80',
              summary: 'The electric atmosphere of the medal rounds in Men’s Ice Hockey.',
              price: 190,
              currency: 'EUR'
            },
            { 
              id: 'p2d5-2', 
              name: 'Pasticceria Cova', 
              type: LocationType.DINING, 
              description: 'Iconic bakery.', 
              coordinates: COORDS.MILAN_DUOMO,
              rating: '4.5',
              reviews: 1300,
              imageUrl: 'https://images.unsplash.com/photo-1517433670267-08bbd4be890f?auto=format&fit=crop&w=600&q=80',
              summary: 'One of Italy’s oldest pasticcerias, established in 1817, known for its elegant espresso service.',
              price: 30,
              currency: 'EUR'
            },
        ]
      },
      {
        dayNumber: 6,
        date: 'Sat Feb 21, 2026',
        title: 'Verona Rest Day',
        description: 'Train to Verona, explore Juliet’s balcony and Roman history.',
        pois: [
            { 
              id: 'p2d6-1', 
              name: 'Hotel Accademia Verona', 
              type: LocationType.HOTEL, 
              description: 'Historic center.', 
              coordinates: COORDS.VERONA_ARENA,
              rating: '4.7',
              reviews: 670,
              imageUrl: 'https://images.unsplash.com/photo-1549658252-167822558668?auto=format&fit=crop&w=600&q=80',
              summary: 'Superior 4-star hotel located in a historic palace just steps from the Arena di Verona.',
              price: 240,
              currency: 'EUR'
            },
            { 
              id: 'p2d6-2', 
              name: 'Ristorante 12 Apostoli', 
              type: LocationType.DINING, 
              description: 'Sumptuous last supper.', 
              coordinates: { lat: 45.4410, lng: 10.9960 },
              rating: '4.6',
              reviews: 410,
              imageUrl: 'https://images.unsplash.com/photo-1550966871-3ed3c47e2ce2?auto=format&fit=crop&w=600&q=80',
              summary: 'Historic restaurant with frescoed walls serving traditional Veronese cuisine since 1750.',
              price: 110,
              currency: 'EUR'
            },
        ]
      },
      {
        dayNumber: 7,
        date: 'Sun Feb 22, 2026',
        title: 'Closing Ceremony',
        description: 'The grand finale at the Verona Arena.',
        pois: [
            { 
              id: 'p2d7-1', 
              name: 'Verona Arena', 
              type: LocationType.EVENT, 
              description: 'Closing Ceremony ~8 PM.', 
              coordinates: COORDS.VERONA_ARENA,
              imageUrl: 'https://images.unsplash.com/photo-1560171850-8911707830cb?auto=format&fit=crop&w=600&q=80',
              summary: 'A Roman amphitheater built in the 1st century AD, providing a spectacular historical setting for the closing of the games.',
              price: 600,
              currency: 'EUR'
            },
        ]
      }
    ]
  },
  {
    id: 'pkg3',
    name: 'Luxury & Rewards',
    tagline: '8 Days | Venice, Cortina, Milan',
    description: 'Maximize credit card perks, lounge access, and open-jaw flights for a luxurious experience.',
    duration: '8 Days',
    primaryColor: 'emerald',
    days: [
      {
        dayNumber: 1,
        date: 'Feb 15, 2026',
        title: 'Venice Arrival',
        description: 'Arrive Venice with stopover perks. Luxury stay at Hotel Londra Palace via Amex FHR.',
        pois: [
             { 
               id: 'p3d1-1', 
               name: 'Hotel Londra Palace', 
               type: LocationType.HOTEL, 
               description: 'Riva degli Schiavoni.', 
               coordinates: COORDS.VENICE_ISLAND,
               rating: '4.8',
               reviews: 500,
               imageUrl: 'https://images.unsplash.com/photo-1523456728551-71df89269b62?auto=format&fit=crop&w=600&q=80',
               summary: 'Historic 5-star hotel offering 53 rooms with views of the lagoon, located just steps from St. Mark’s Square.',
               price: 850,
               currency: 'EUR'
             },
             { 
               id: 'p3d1-2', 
               name: 'Ristorante Riviera', 
               type: LocationType.DINING, 
               description: 'Dining on Giudecca.', 
               coordinates: { lat: 45.4260, lng: 12.3250 },
               rating: '4.7',
               reviews: 320,
               imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=600&q=80',
               summary: 'Fine dining on the Zattere waterfront, offering modern Venetian cuisine and impeccable service.',
               price: 180,
               currency: 'EUR'
             },
        ]
      },
      {
        dayNumber: 3,
        date: 'Feb 17, 2026',
        title: 'Cortina & Snowboarding',
        description: 'First class transfer to Cortina. Stay at Cristallo (Marriott Bonvoy).',
        pois: [
            { 
              id: 'p3d3-1', 
              name: 'Cristallo Resort', 
              type: LocationType.HOTEL, 
              description: 'Luxury Collection Resort.', 
              coordinates: { lat: 46.5350, lng: 12.1450 },
              rating: '4.9',
              reviews: 600,
              imageUrl: 'https://images.unsplash.com/photo-1563911302283-d2bc129e7c1f?auto=format&fit=crop&w=600&q=80',
              summary: 'The ultimate luxury experience in the Dolomites, featuring chandeliers, a spa, and palatial rooms.',
              price: 1200,
              currency: 'EUR'
            },
             { 
               id: 'p3d3-2', 
               name: 'Cortina Snow Park', 
               type: LocationType.EVENT, 
               description: 'Snowboarding Halfpipe.', 
               coordinates: COORDS.CORTINA,
               imageUrl: 'https://images.unsplash.com/photo-1453230806017-56d4853fa656?auto=format&fit=crop&w=600&q=80',
               summary: 'Watch high-flying aerial tricks as snowboarders compete in the halfpipe finals.',
               price: 150,
               currency: 'EUR'
             },
        ]
      },
      {
        dayNumber: 4,
        date: 'Feb 18, 2026',
        title: 'Milan via First Class',
        description: 'Scenic train to Milan. Park Hyatt stay using Visa Signature perks.',
        pois: [
            { 
              id: 'p3d4-1', 
              name: 'Park Hyatt Milan', 
              type: LocationType.HOTEL, 
              description: 'Next to Duomo.', 
              coordinates: COORDS.MILAN_DUOMO,
              rating: '4.9',
              reviews: 800,
              imageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80',
              summary: 'Sophisticated 5-star hotel featuring direct access to the Galleria Vittorio Emanuele II.',
              price: 950,
              currency: 'EUR'
            },
        ]
      },
      {
        dayNumber: 6,
        date: 'Feb 20, 2026',
        title: 'VIP Closing',
        description: 'Hospitality package at Verona Arena, then private transfer to airport.',
        pois: [
            { 
              id: 'p3d6-1', 
              name: 'Verona Arena', 
              type: LocationType.EVENT, 
              description: 'VIP Hospitality Closing Ceremony.', 
              coordinates: COORDS.VERONA_ARENA,
              imageUrl: 'https://images.unsplash.com/photo-1534063997637-a50e9eb0eb20?auto=format&fit=crop&w=600&q=80',
              summary: 'Exclusive box seating and pre-show reception at the historic Roman arena.',
              price: 1500,
              currency: 'EUR'
            },
        ]
      }
    ]
  },
  {
    id: 'pkg4',
    name: 'Build Your Own Adventure',
    tagline: 'Custom | Flexible Itinerary',
    description: 'Start from scratch. Book flights, choose hotels, and discover local gems at your own pace.',
    duration: 'Flexible',
    primaryColor: 'amber',
    days: [] 
  }
];
