API Parameters
Search Query
q

Optional

Parameter defines the query you want to search. You can use anything that you would use in a regular Google Maps search. The parameter is only required if type is set to search.

Geographic Location
ll

Optional

Parameter defines the GPS coordinates for the search origin. Its value must match the following format:
@ + latitude + , + longitude + , + zoom/map_height

This will form a string that looks like:
@40.7455096,-74.0083012,14z or @43.8521864,11.2168835,10410m.

The minimum zoom value is 3z (the map is completely zoomed out). The maximum effective zoom value depends on the location, ranging from 18z to 23z. Some locations may support even higher zoom values, so we allow values up to 30z.

Alternatively, you can specify map_height in meters. The minimum value is 1m. The maximum value is 15028132m, which roughly equals 3z on the equator.

Parameter is applied only when type is set to search.
Parameter can't be used with ll, lat, lon, z, or m parameters.
Results are not guaranteed to be within the requested geographic location.

location

Optional

Parameter defines the location, whose GPS coordinates are used for the search origin. At the end, coordinates are encoded as part of the ll parameter.

Parameter should be used with z or m parameter.
Parameter can't be used with ll, lat or lon parameters.

lat

Optional

Parameter defines a GPS latitude for the search origin. At the end, it is encoded as part of the ll parameter.

Parameter is required when using lon parameter.
Parameter should be used with z or m parameter.
Parameter can't be used with ll or location parameters.

lon

Optional

Parameter defines a GPS longitude for the search origin. At the end, it is encoded as part of the ll parameter.

Parameter is required when using lat parameter.
Parameter should be used with z or m parameter.
Parameter can't be used with ll or location parameters.

z

Optional

Parameter defines a map zoom level. The minimum value is 3 (the map is completely zoomed out). The maximum effective value depends on the location, ranging from 18 to 23. Some locations may support even higher values, so we allow values up to 30. At the end, it is encoded as part of the ll parameter.

Either z or m is required when using location or lat/lon parameters.

m

Optional

Parameter defines a map height in meters. The minimum value is 1. The maximum value is 15028132, which roughly equals 3z on the equator. At the end, it is encoded as part of the ll parameter.

Either m or z is required when using location or lat/lon parameters.

nearby

Optional

Parameter forces to return search results closer to the specified location.

Parameter is highly recommended when q parameter includes near me keywords.
Parameter is not recommended when q parameter includes location.
Parameter should be used with ll, location, or lat/lon parameters.

Localization
google_domain

Optional

Parameter defines the Google domain to use. It defaults to google.com. Head to the Google domains page for a full list of supported Google domains.

hl

Optional

Parameter defines the language to use for the Google Maps search. It's a two-letter language code. (e.g., en for English, es for Spanish, or fr for French). Head to the Google Maps languages page for a full list of supported Google Maps languages.

gl

Optional

Parameter defines the country to use for the Google Maps search. It's a two-letter country code. (e.g., us for the United States, uk for United Kingdom, or fr for France). Head to the Google countries page for a full list of supported Google countries.

Parameter only affects Place Results API.

Advanced Google Maps Parameters
data

Optional

This parameter is deprecated, please use place_id or data_cid instead.

Parameter can be used to filter the search results. You can visit Google Maps website, set filters you want and simply copy the data value from their URL to SerpApi URL.

One of the uses of the parameter is to search for a specific place; therefore, it is required if the type is set to place.

To use the data parameter to search for a specific place, it needs to be constructed in the following sequence:
!4m5!3m4!1s + data_id + !8m2!3d + latitude + !4d + longitude

This will form a string that looks like this: !4m5!3m4!1s0x89c259b7abdd4769:0xc385876db174521a!8m2!3d40.750231!4d-74.004019.

You can find the data_id using our Google Maps API.

place_id

Optional

Parameter defines the unique reference to a place in Google Maps. Place IDs are available for most locations, including businesses, landmarks, parks, and intersections. You can find the place_id using our Google Maps API.

You can read more about Place IDs here.

place_id can be used without any other optional parameter.
place_id and data_cid can't be used together.
Parameter should not be confused with place_id in Google Search API and Google Local API which are the same as data_cid in Google Maps API.

data_cid

Optional

Parameter defines the Google CID (customer identifier) of a place. This parameter can be found in Google Maps API local results, as well as in Google Search API and Google Local API local results under the name of place_id. You can also acquire it using Google's CID converter.

data_cid can be used without any other optional parameter.
data_cid and place_id can't be used together.

Search Type
type

Required

Parameter defines the type of search you want to make. It can be set to:
search - returns a list of results for the set q parameter,
place - returns results for a specific place when data parameter is set

Parameter is not required when using place_id or data_cid.

Pagination
start

Optional

Parameter defines the result offset. It skips the given number of results. It's used for pagination. (e.g., 0 (default) is the first page of results, 20 is the 2nd page of results, 40 is the 3rd page of results, etc.).

We recommend starting with 0 and increasing by 20 for the next page. There is no hard limit on the maximum offset number, but we recommend a maximum of 100 (page six) which is the same behavior as with the Google Maps web app. More than that, the result might be duplicated or irrelevant.

Serpapi Parameters
engine

Required

Set parameter to google_maps to use the Google Maps API engine.

no_cache

Optional

Parameter will force SerpApi to fetch the Google Maps results even if a cached version is already present. A cache is served only if the query and all parameters are exactly the same. Cache expires after 1h. Cached searches are free, and are not counted towards your searches per month. It can be set to false (default) to allow results from the cache, or true to disallow results from the cache. no_cache and async parameters should not be used together.

async

Optional

Parameter defines the way you want to submit your search to SerpApi. It can be set to false (default) to open an HTTP connection and keep it open until you got your search results, or true to just submit your search to SerpApi and retrieve them later. In this case, you'll need to use our Searches Archive API to retrieve your results. async and no_cache parameters should not be used together. async should not be used on accounts with Ludicrous Speed enabled.

zero_trace

Optional

Enterprise only. Parameter enables ZeroTrace mode. It can be set to false (default) or true. Enable this mode to skip storing search parameters, search files, and search metadata on our servers. This may make debugging more difficult.

api_key

Required

Parameter defines the SerpApi private key to use.

output

Optional

Parameter defines the final output you want. It can be set to json (default) to get a structured JSON of the results, or html to get the raw html retrieved.

json_restrictor

Optional

Parameter defines the fields you want to restrict in the outputs for smaller, faster responses. See JSON Restrictor for more details.

API Results
JSON Results
JSON output includes structured data for maps local results and maps place results.

A search status is accessible through search_metadata.status. It flows this way: Processing -> Success || Error. If a search has failed, error will contain an error message. search_metadata.id is the search ID inside SerpApi.

HTML Results
HTML output is useful to debug JSON results or support features not supported yet by SerpApi.
HTML output gives you the raw HTML results from Google.

* When pagination is being used, API does not have an HTML response, just a text. search_metadata.prettify_html_file contains link to the prettified version of the result. It is displayed in playground.

API Examples
Example with 
q
:
pizza
and optional 
ll
 parameters
GET


https://serpapi.com/search.json?engine=google_maps&q=pizza&ll=@40.7455096,-74.0083012,15.1z&type=search

Code to integrate


Python

from serpapi import GoogleSearch

params = {
  "engine": "google_maps",
  "q": "pizza",
  "ll": "@40.7455096,-74.0083012,15.1z",
  "type": "search",
  "api_key": "c446845474020972d26bd9ddcc850a90799d59ef9ad7a7a1c617052283e6fcac"
}

search = GoogleSearch(params)
results = search.get_dict()
local_results = results["local_results"]

JSON Example

{
  "search_metadata": {
    "id": "65a1d5f03a218a9a3fdc0a9f",
    "status": "Success",
    "json_endpoint": "https://serpapi.com/searches/5d84abd1659fe51c/65a1d5f03a218a9a3fdc0a9f.json",
    "created_at": "2024-01-13 00:14:40 UTC",
    "processed_at": "2024-01-13 00:14:40 UTC",
    "google_maps_url": "https://www.google.com/maps/search/pizza/@40.7455096,-74.0083012,14z?hl=en",
    "raw_html_file": "https://serpapi.com/searches/5d84abd1659fe51c/65a1d5f03a218a9a3fdc0a9f.html",
    "total_time_taken": 2.94
  },
  "search_parameters": {
    "engine": "google_maps",
    "type": "search",
    "q": "pizza",
    "ll": "@40.7455096,-74.0083012,14z",
    "google_domain": "google.com",
    "hl": "en"
  },
  "search_information": {
    "local_results_state": "Results for exact spelling",
    "query_displayed": "pizza"
  },
  "local_results": [
    {
      "position": 1,
      "title": "Joe's Pizza Broadway",
      "place_id": "ChIJifIePKtZwokRVZ-UdRGkZzs",
      "data_id": "0x89c259ab3c1ef289:0x3b67a41175949f55",
      "data_cid": "4280570365733019477",
      "reviews_link": "https://serpapi.com/search.json?data_id=0x89c259ab3c1ef289%3A0x3b67a41175949f55&engine=google_maps_reviews&hl=en",
      "photos_link": "https://serpapi.com/search.json?data_id=0x89c259ab3c1ef289%3A0x3b67a41175949f55&engine=google_maps_photos&hl=en",
      "gps_coordinates": {
        "latitude": 40.754679499999995,
        "longitude": -73.9870291
      },
      "place_id_search": "https://serpapi.com/search.json?engine=google_maps&google_domain=google.com&hl=en&place_id=ChIJifIePKtZwokRVZ-UdRGkZzs",
      "provider_id": "/g/11bw4ws2mt",
      "rating": 4.5,
      "reviews": 17266,
      "price": "$",
      "type": "Pizza restaurant",
      "types": [
        "Pizza restaurant",
        "Pizza delivery",
        "Restaurant"
      ],
      "type_id": "pizza_restaurant",
      "type_ids": [
        "pizza_restaurant",
        "pizza_delivery",
        "restaurant"
      ],
      "address": "1435 Broadway, New York, NY 10018",
      "open_state": "Open ⋅ Closes 5 AM Sat",
      "hours": "Open ⋅ Closes 5 AM Sat",
      "operating_hours": {
        "friday": "10 AM–5 AM",
        "saturday": "10 AM–5 AM",
        "sunday": "10 AM–4 AM",
        "monday": "10 AM–4 AM",
        "tuesday": "10 AM–4 AM",
        "wednesday": "10 AM–4 AM",
        "thursday": "10 AM–4 AM"
      },
      "phone": "(646) 559-4878",
      "website": "http://joespizzanyc.com/",
      "description": "Classic NYC slice shop. Modern outpost of a longtime counter-serve pizza joint prepping New York-style slices and pies.",
      "service_options": {
        "dine_in": true,
        "takeout": true,
        "no_contact_delivery": true
      },
      "order_online": "https://food.google.com/chooseprovider?restaurantId=/g/11bw4ws2mt&g2lbs=AIQllVwZUQMq-GnQ20P0H5UrnBtAx3VEn9dbUzYWGIKULm91HORAhyw94aP7xDfovv_uR1RAzlN35qEzlsZJ4yq21MKCGF_30_f5EpJlNXmrXhPWRAhYwVM36iHo91f1h0yJ3AxWSF4rY_2i06xpJOLA1IMWpNR-Rg%3D%3D&hl=en-US&gl=us&fo_m=MfohQo559jFvMUOzJVpjPL1YMfZ3bInYwBDuMfaXTPp5KXh-&utm_source=tactile&gei=8dWhZfreGYXAi-gPheCdkAI&ei=8dWhZfreGYXAi-gPheCdkAI&fo_s=OA,SOE&opi=79508299",
      "thumbnail": "https://lh5.googleusercontent.com/p/AF1QipNhcaKMILyQDZIailnNG6WL9EHzU8H2MJau-mXY=w128-h92-k-no",
      "serpapi_thumbnail": "https://serpapi.com/images/url/_HaX9nicuxmXUVJSUGylr5-TYaqXnp-fnpNaWpxalJyfV5KaV6KXnJ-rX6Dv6GYYmFngl5Gc6O3r6VMZ6BLlmZiZk-fnbhbuY-nqURVq4WHk65VYqpsbEWlbbmhkoZthaaSbrZuXDwCiCCDo"
    },
    {
      "position": 2,
      "title": "Little Italy Pizza",
      "place_id": "ChIJj5R4TqhZwokRuxkrhtALBKk",
      "data_id": "0x89c259a84e78948f:0xa9040bd0862b19bb",
      "data_cid": "12178872282548738491",
      "reviews_link": "https://serpapi.com/search.json?data_id=0x89c259a84e78948f%3A0xa9040bd0862b19bb&engine=google_maps_reviews&hl=en",
      "photos_link": "https://serpapi.com/search.json?data_id=0x89c259a84e78948f%3A0xa9040bd0862b19bb&engine=google_maps_photos&hl=en",
      "gps_coordinates": {
        "latitude": 40.747606999999995,
        "longitude": -73.9848854
      },
      "place_id_search": "https://serpapi.com/search.json?engine=google_maps&google_domain=google.com&hl=en&place_id=ChIJj5R4TqhZwokRuxkrhtALBKk",
      "provider_id": "/g/1tcx7ycp",
      "rating": 4.2,
      "reviews": 3634,
      "price": "$",
      "type": "Pizza restaurant",
      "types": [
        "Pizza restaurant",
        "Italian restaurant",
        "Takeout Restaurant",
        "Pizza delivery"
      ],
      "type_id": "pizza_restaurant",
      "type_ids": [
        "pizza_restaurant",
        "italian_restaurant",
        "takeout_restaurant",
        "pizza_delivery"
      ],
      "address": "2 E 33rd St, New York, NY 10016",
      "open_state": "Open ⋅ Closes 5 AM Sat",
      "hours": "Open ⋅ Closes 5 AM Sat",
      "operating_hours": {
        "friday": "9 AM–5 AM",
        "saturday": "9 AM–5 AM",
        "sunday": "9 AM–4 AM",
        "monday": "9 AM–4 AM",
        "tuesday": "9 AM–4 AM",
        "wednesday": "9 AM–4 AM",
        "thursday": "9 AM–4 AM"
      },
      "phone": "(212) 481-5200",
      "website": "https://www.littleitalypizza.com/",
      "description": "New York-style pizzeria. Slices on-the-go, New York-style pies & calzones in a counter-service Midtown setting.",
      "service_options": {
        "dine_in": true,
        "takeout": true,
        "delivery": true
      },
      "order_online": "https://food.google.com/chooseprovider?restaurantId=/g/1tcx7ycp&g2lbs=AIQllVxLYUnVoJMH-xaeG7L2C1If163FKmsOmPDB1Lm6r9nkLrQPWX3Di-MK0IMCaEsQbNotwXUa45pE_nEd717JSre-EuOnS63Gb8tdelJzaTqtw-7kNlI-l1mmWBFl3r_Qg48vdQR0fLKEykKwyB7N39kUtJ7w5w%3D%3D&hl=en-US&gl=us&fo_m=MfohQo559jFvMUOzJVpjPL1YMfZ3bInYwBDuMfaXTPp5KXh-&utm_source=tactile&gei=8dWhZfreGYXAi-gPheCdkAI&ei=8dWhZfreGYXAi-gPheCdkAI&fo_s=OA,SOE&opi=79508299",
      "thumbnail": "https://lh5.googleusercontent.com/p/AF1QipOXsOKyhj_qB8l9idMSe8VOTo4tJ4g4j15Sr79X=w147-h92-k-no",
      "serpapi_thumbnail": "https://serpapi.com/images/url/pm4xGHicuxmXUVJSUGylr5-TYaqXnp-fnpNaWpxalJyfV5KaV6KXnJ-rX6Dv6GYYmFngH1Hs712ZkRVf6GSRY5mZ4hucahHmH5JvUuJlkm6SZWgaXGRuGWFbbmhirpthaaSbrZuXDwCsACD-"
    },
    {
      "position": 3,
      "title": "Angelo's Pizza",
      "place_id": "ChIJCTvSdPhYwokR5PDoOE7VuCc",
      "data_id": "0x89c258f874d23b09:0x27b8d54e38e8f0e4",
      "data_cid": "2862272095132905700",
      "reviews_link": "https://serpapi.com/search.json?data_id=0x89c258f874d23b09%3A0x27b8d54e38e8f0e4&engine=google_maps_reviews&hl=en",
      "photos_link": "https://serpapi.com/search.json?data_id=0x89c258f874d23b09%3A0x27b8d54e38e8f0e4&engine=google_maps_photos&hl=en",
      "gps_coordinates": {
        "latitude": 40.7638118,
        "longitude": -73.98294469999999
      },
      "place_id_search": "https://serpapi.com/search.json?engine=google_maps&google_domain=google.com&hl=en&place_id=ChIJCTvSdPhYwokR5PDoOE7VuCc",
      "provider_id": "/g/1th5dgw_",
      "rating": 4.2,
      "reviews": 2036,
      "price": "$$",
      "type": "Pizza restaurant",
      "types": [
        "Pizza restaurant",
        "Italian restaurant"
      ],
      "type_id": "pizza_restaurant",
      "type_ids": [
        "pizza_restaurant",
        "italian_restaurant"
      ],
      "address": "1697 Broadway, New York, NY 10019",
      "open_state": "Open ⋅ Closes 3 AM",
      "hours": "Open ⋅ Closes 3 AM",
      "operating_hours": {
        "friday": "11:30 AM–3 AM",
        "saturday": "11:30 AM–3 AM",
        "sunday": "11:30 AM–3 AM",
        "monday": "11:30 AM–3 AM",
        "tuesday": "11:30 AM–3 AM",
        "wednesday": "11:30 AM–3 AM",
        "thursday": "11:30 AM–3 AM"
      },
      "phone": "(212) 245-8811",
      "website": "https://www.angelosbroadway.com/?y_source=1_OTM1MzAwOTktNzE1LWxvY2F0aW9uLndlYnNpdGU%3D",
      "description": "Coal-fired, brick-oven pizza. Family-friendly pizzeria serving thin-crust pies alongside calzones, pastas & salads.",
      "service_options": {
        "dine_in": true,
        "curbside_pickup": true,
        "no_contact_delivery": true
      },
      "reserve_a_table": "https://www.google.com/maps/reserve/v/dine/c/m7pZRkxkv7E?source=pa&opi=79508299&hl=en-US&gei=8dWhZfreGYXAi-gPheCdkAI&sourceurl=http://www.google.com/service/MapsSearchService/Search?hl%3Den%26authuser%3D0%26gl%3Dus%26q%3Dpizza%26tbm%3Dmap",
      "order_online": "https://food.google.com/chooseprovider?restaurantId=/g/1th5dgw_&g2lbs=AIQllVxV4fUgfVrBfL7BbzTnZRumVuSYnwEYp-EzAioP60pnEo7dsctVz6oI_DlySvdoTe3J0NBvNKvzAM0FXcjF4L-xBoh3GCqFt2jQgBupyQLk1Z8msI65-HTW6TXq5OIQoMV5Q5htVMG20S9Kscuou29fZa89SA%3D%3D&hl=en-US&gl=us&fo_m=MfohQo559jFvMUOzJVpjPL1YMfZ3bInYwBDuMfaXTPp5KXh-&utm_source=tactile&gei=8dWhZfreGYXAi-gPheCdkAI&ei=8dWhZfreGYXAi-gPheCdkAI&fo_s=OA,SOE&opi=79508299",
      "thumbnail": "https://lh5.googleusercontent.com/p/AF1QipNVIN-HKIxqx_20VoUNw5HR4udPYlBrSDw_Jl2g=w80-h100-k-no",
      "serpapi_thumbnail": "https://serpapi.com/images/url/gPemq3icuxmXUVJSUGylr5-TYaqXnp-fnpNaWpxalJyfV5KaV6KXnJ-rX6Dv6GYYmFngF-bpp-vh7VlRWBFvZBCWH-pXbuoRZFKaEhCZ41QU7FIe75VjlG5bbmGgm2FoYKCbrZuXDwCgQCEY"
    },
    {
      "position": 4,
      "title": "Uncle Paul's Pizza NY",
      "place_id": "ChIJPxPd_P1YwokRfzLhSiACEoU",
      "data_id": "0x89c258fdfcdd133f:0x851202204ae1327f",
      "data_cid": "9588728894343688831",
      "reviews_link": "https://serpapi.com/search.json?data_id=0x89c258fdfcdd133f%3A0x851202204ae1327f&engine=google_maps_reviews&hl=en",
      "photos_link": "https://serpapi.com/search.json?data_id=0x89c258fdfcdd133f%3A0x851202204ae1327f&engine=google_maps_photos&hl=en",
      "gps_coordinates": {
        "latitude": 40.7546824,
        "longitude": -73.9768744
      },
      "place_id_search": "https://serpapi.com/search.json?engine=google_maps&google_domain=google.com&hl=en&place_id=ChIJPxPd_P1YwokRfzLhSiACEoU",
      "provider_id": "/g/11cfhqnqf",
      "rating": 4.4,
      "reviews": 2200,
      "price": "$$",
      "type": "Pizza restaurant",
      "types": [
        "Pizza restaurant",
        "Delivery Restaurant",
        "Pizza delivery",
        "Wine bar"
      ],
      "type_id": "pizza_restaurant",
      "type_ids": [
        "pizza_restaurant",
        "delivery_restaurant",
        "pizza_delivery",
        "wine_bar"
      ],
      "address": "70 Vanderbilt Ave, New York, NY 10017",
      "open_state": "Open ⋅ Closes 9 PM",
      "hours": "Open ⋅ Closes 9 PM",
      "operating_hours": {
        "friday": "10 AM–9 PM",
        "saturday": "10 AM–9 PM",
        "sunday": "10 AM–9 PM",
        "monday": "10 AM–9 PM",
        "tuesday": "10 AM–9 PM",
        "wednesday": "10 AM–9 PM",
        "thursday": "10 AM–9 PM"
      },
      "phone": "(212) 922-1200",
      "website": "https://www.unclepaulspizzamenu.com/",
      "description": "Casual 24-hour Italian eatery. Slices, pies & Italian dishes with a gourmet twist are served round-the-clock in a low-key space.",
      "service_options": {
        "dine_in": true,
        "takeout": true,
        "no_contact_delivery": true
      },
      "order_online": "https://food.google.com/chooseprovider?restaurantId=/g/11cfhqnqf&g2lbs=AIQllVwwFV-00KVtXPDLOl909gygKO1sb8ufsiTp4qrzDue8tLx2LI8usIZdD5vl_ws8gi5RkBKOTGggSaxNRFmBIMbevCDCh-6CX4dPqc9BXZggJTH_GdMup4K9TVz2GPf2Ot5oeaXrGmvMdhLTjbfDfR7HT771Vg%3D%3D&hl=en-US&gl=us&fo_m=MfohQo559jFvMUOzJVpjPL1YMfZ3bInYwBDuMfaXTPp5KXh-&utm_source=tactile&gei=8dWhZfreGYXAi-gPheCdkAI&ei=8dWhZfreGYXAi-gPheCdkAI&fo_s=OA,SOE&opi=79508299",
      "thumbnail": "https://lh3.googleusercontent.com/gps-proxy/AMy85WLRblytFif4FRHHG1pnPF2PHs-Luusohb1mFT9pohp7x7cIpe2JN4k4rzQxvgRJlFBowt99Z7YQ_DzFe7kqwyZd8pUvFfRGUm05JoDrt9YePoYV057LYqZ42jNyLPSr9chd8sM25ii1aLC7d6V_HPZbrqCvBNwvr7SbejicmSeEWgBxbTKq8KR2=w147-h92-k-no",
      "serpapi_thumbnail": "https://serpapi.com/images/url/EvqianicBcFLcoIwAADQEyGSQkM600XRRorIIPgZ2DgFIkE-CUn4eVMv0nXfe_1Rpbj80PWGvq1KxsqGDJKInHWKdGqVs1YvudS4YPOifx0W27r6UdYsCld3E0euuzN4F2IQulLzh0EymhktPiHOKIczzH84AV5g1qZ4HuexjLwGO2xSCKUwOd62T0xg3U9LWtj8POJ7tDu3a8tjW6FQQkKWXNYW9JM-NcEjWPwwFiinhS0PwKoq49ffwOL9cnPDNBP9ZnSCaRQwzsijytuYfF9LZ85O-97eR-BzMkyoUQS0WuvYP4zZVlQ"
    },
    ...
  ],
  "serpapi_pagination": {
    "next": "https://serpapi.com/search.json?engine=google_maps&google_domain=google.com&hl=en&ll=%4040.7455096%2C-74.0083012%2C14z&q=pizza&start=20&type=search"
  }
}
Example of
unclaimed_listing
Some business places are not yet claimed. These places will have the field "unclaimed_listing" set to true.

GET


https://serpapi.com/search.json?engine=google_maps&q=BBQ&type=search

Code to integrate


Python

from serpapi import GoogleSearch

params = {
  "engine": "google_maps",
  "q": "BBQ",
  "type": "search",
  "api_key": "c446845474020972d26bd9ddcc850a90799d59ef9ad7a7a1c617052283e6fcac"
}

search = GoogleSearch(params)
results = search.get_dict()
local_results = results["local_results"]

JSON Example

  {
    ...
    "local_results": [
      ...
      {
        "position": 18,
        "title": "BBQ Stand",
        "place_id": "ChIJzVcorM1ZwokRZZIrWe_tQ-8",
        ...
        "unclaimed_listing": true,
        ...
      },
      ...
    ],
    ...
  }