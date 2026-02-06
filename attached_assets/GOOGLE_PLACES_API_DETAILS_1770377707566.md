Select platform: [Android](https://developers.google.com/maps/documentation/places/android-sdk/details-place "View this page for the Android platform docs.") [iOS](https://developers.google.com/maps/documentation/places/ios-sdk/details-place "View this page for the iOS platform docs.") [JavaScript](https://developers.google.com/maps/documentation/javascript/place-details "View this page for the JavaScript platform docs.") [Web Service](https://developers.google.com/maps/documentation/places/web-service/place-details "View this page for the Web Service platform docs.")  
**European Economic Area (EEA) developers** If your billing address is in the European Economic Area, effective on 8 July 2025, the [Google Maps Platform EEA Terms of Service](https://cloud.google.com/terms/maps-platform/eea) will apply to your use of the Services. Functionality varies by region. [Learn more](https://developers.google.com/maps/comms/eea/faq).

## Introduction

Once you have a [place ID](https://developers.google.com/maps/documentation/places/web-service/place-id), you can
request more details about a particular establishment or
point of interest by initiating a
[Place Details (New)](https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places/get)
request. A Place Details (New)
request returns more comprehensive information about the indicated place
such as its complete address, phone number, user rating and reviews.

There are many ways to obtain a place ID. You can use:

- [Text Search (New)](https://developers.google.com/maps/documentation/places/web-service/text-search) or [Nearby Search (New)](https://developers.google.com/maps/documentation/places/web-service/nearby-search)
- [Geocoding API](https://developers.google.com/maps/documentation/geocoding)
- [Routes API](https://developers.google.com/maps/documentation/routes)
- [Address Validation API](https://developers.google.com/maps/documentation/address-validation)
- [Autocomplete (New)](https://developers.google.com/maps/documentation/places/web-service/place-autocomplete)

The APIs Explorer lets you make live requests so that you can get familiar with
the API and the API options:  
[Try it!](https://developers.google.com/maps/documentation/places/web-service/place-details#try_it)

## Place Details (New) requests

A Place Details (New) request is an HTTP GET request in the form:  

```scdoc
https://places.googleapis.com/v1/places/PLACE_ID
```

Pass all parameters as URL parameters or in headers as part of the
GET request. For example:  

```html
https://places.googleapis.com/v1/places/ChIJj61dQgK6j4AR4GeTYWZsKWw?fields=id,displayName&key=API_KEY
```

Or in a curl command:  

```
curl -X GET -H 'Content-Type: application/json' \
-H "X-Goog-Api-Key: API_KEY" \
-H "X-Goog-FieldMask: id,displayName" \
https://places.googleapis.com/v1/places/ChIJj61dQgK6j4AR4GeTYWZsKWw
```

## Place Details (New) responses

Place Details (New) returns a
[JSON object as a response](https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places/get#response-body). In the response:

- The response is represented by a [`Place`](https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places) object. The `Place` object contains detailed information about the place.
- The [FieldMask](https://developers.google.com/maps/documentation/places/web-service/place-details#fieldmask) passed in the request specifies the list of fields returned in the `Place` object.

The complete JSON object is in the form:  

```json
{
  "name": "places/ChIJkR8FdQNB0VQRm64T_lv1g1g",
  "id": "ChIJkR8FdQNB0VQRm64T_lv1g1g",
  "displayName": {
    "text": "Trinidad"
  }
  ...
}
```

## Required parameters

-

  ### FieldMask

  Specify the list of fields to return in the response by creating a
  [response field mask](https://developers.google.com/maps/documentation/places/web-service/choose-fields).
  Pass the response field mask to the method by using the URL parameter
  `$fields` or `fields`, or by using the HTTP header
  `X-Goog-FieldMask`. There is no default list of returned fields in the response.
  If you omit the field mask, the method returns an error.

  Field masking is a good design practice to ensure that you don't request
  unnecessary data, which helps to avoid unnecessary processing time and
  billing charges.

  Specify a comma-separated list of place data types to return. For example,
  to retrieve the display name and the address of the place.  

  ```javascript
  X-Goog-FieldMask: displayName,formattedAddress
  ```
  | **Note:**Spaces are not allowed anywhere in the field list.

  Use `*` to retrieve all fields.  

  ```javascript
  X-Goog-FieldMask: *
  ```
  | While the wildcard (\*) is fine to use in development, Google discourages the use of the wildcard response field mask in production because of the large amount of data that can be returned.
  | Further guidance for using `iconMaskBaseUri` and `iconBackgroundColor` can be found in [Place Icons](https://developers.google.com/maps/documentation/places/web-service/icons) section.

  Specify one or more of the following fields:
  - The following fields trigger the [Place Details Essentials IDs Only SKU](https://developers.google.com/maps/billing-and-pricing/sku-details#place-details-id-only-ess-sku):


    `attributions`   

    `id`   

    `moved_place`   

    `moved_place_id`   

    `name`^\*^   

    `photos`  

    ^\*^ The `name` field contains the place *resource name*
    in the form: `places/`<var translate="no">PLACE_ID</var>. To get the text name of the place, request the `displayName` field in the Pro SKU.

    <br />

  - The following fields trigger the [Place Details Essentials SKU](https://developers.google.com/maps/billing-and-pricing/sku-details#place-details-ess-sku):


    `addressComponents`   

    `addressDescriptor`^\*^   

    `adrFormatAddress`   

    `formattedAddress`   

    `location`   

    `plusCode`   

    `postalAddress`   

    `shortFormattedAddress`   

    `types`   

    `viewport`   


    ^\*^ Address descriptors are generally available for customers in India and are experimental elsewhere.  

  - The following fields trigger the [Place Details Pro SKU](https://developers.google.com/maps/billing-and-pricing/sku-details#place-details-pro-sku):


    `accessibilityOptions`   

    `businessStatus`   

    `containingPlaces`   

    `displayName`   

    `googleMapsLinks`   

    `googleMapsUri`   

    `iconBackgroundColor`   

    `iconMaskBaseUri`   

    `primaryType`   

    `primaryTypeDisplayName`   

    `pureServiceAreaBusiness`   

    `subDestinations`   

    `utcOffsetMinutes`  

  - The following fields trigger the [Place Details Enterprise SKU](https://developers.google.com/maps/billing-and-pricing/sku-details#place-details-ent-sku):


    `currentOpeningHours`   

    `currentSecondaryOpeningHours`   

    `internationalPhoneNumber`   

    `nationalPhoneNumber`   

    `priceLevel`   

    `priceRange`   

    `rating`   

    `regularOpeningHours`   

    `regularSecondaryOpeningHours`   

    `userRatingCount`   

    `websiteUri`
  - The following fields trigger the [Place Details Enterprise + Atmosphere SKU](https://developers.google.com/maps/billing-and-pricing/sku-details#place-details-ent-plus-sku):

    `allowsDogs`   

    `curbsidePickup`   

    `delivery`   

    `dineIn`   

    `editorialSummary`   

    `evChargeAmenitySummary`   

    `evChargeOptions`   

    `fuelOptions`   

    `generativeSummary`   

    `goodForChildren`   

    `goodForGroups`   

    `goodForWatchingSports`   

    `liveMusic`   

    `menuForChildren`   

    `neighborhoodSummary`   

    `parkingOptions`   

    `paymentOptions`   

    `outdoorSeating`   

    `reservable`   

    `restroom`   

    `reviews`   

    `reviewSummary`   

    `routingSummaries`^\*^  

    `servesBeer`   

    `servesBreakfast`   

    `servesBrunch`   

    `servesCocktails`   

    `servesCoffee`   

    `servesDessert`   

    `servesDinner`   

    `servesLunch`   

    `servesVegetarianFood`   

    `servesWine`   

    `takeout`  


    ^\*^ Text Search and Nearby Search only
-

  ### placeId

  A textual identifier that uniquely identifies a place, returned from a
  [Text Search (New)](https://developers.google.com/maps/documentation/places/web-service/text-search) or
  [Nearby Search (New)](https://developers.google.com/maps/documentation/places/web-service/nearby-search).
  For more information about place IDs, see the
  [place ID overview](https://developers.google.com/maps/documentation/places/web-service/place-id).

  The string `places/`<var translate="no">PLACE_ID</var> is also called the place
  *resource name* . In the response from a Place Details (New),
  Nearby Search (New), and Text Search (New)
  request, this string is contained in the `name` field of the response. The standalone
  place ID is contained in the `id` field of the response.
  | **Note:** In the [Place Details (Legacy)](https://developers.google.com/maps/documentation/places/web-service/details), the `name` field of the response contained the human-readable name for the place. In the new API, that field is now called `displayName`.

## Optional parameters

-

  ### languageCode

  The language in which to return results.
  - See the [list of supported languages](https://developers.google.com/maps/faq#languagesupport). Google often updates the supported languages, so this list may not be exhaustive.
  - If `languageCode` is not supplied, the API defaults to `en`. If you specify an invalid language code, the API returns an `INVALID_ARGUMENT` error.
  - The API does its best to provide a street address that is readable for both the user and locals. To achieve that goal, it returns street addresses in the local language, transliterated to a script readable by the user if necessary, observing the preferred language. All other addresses are returned in the preferred language. Address components are all returned in the same language, which is chosen from the first component.
  - If a name is not available in the preferred language, the API uses the closest match.
  - The preferred language has a small influence on the set of results that the API chooses to return, and the order in which they are returned. The geocoder interprets abbreviations differently depending on language, such as the abbreviations for street types, or synonyms that may be valid in one language but not in another.
-

  ### regionCode

  The region code used to format the response, specified as a
  [two-character CLDR code](https://www.unicode.org/cldr/charts/latest/supplemental/territory_language_information.html) value. There is no default value.

  If the country name of the `formattedAddress` field in the response matches the
  `regionCode`, the country code is omitted from `formattedAddress`.
  This parameter has no effect on `adrFormatAddress`, which always includes the country
  name, or on `shortFormattedAddress`, which never includes it.

  Most CLDR codes are identical to ISO 3166-1 codes,
  with some notable exceptions. For example, the United Kingdom's ccTLD is
  "uk" (.co.uk) while its ISO 3166-1 code is "gb" (technically for the
  entity of "The United Kingdom of Great Britain and Northern Ireland").
  The parameter can affect results based on applicable law.
-

  ### sessionToken

  Session tokens are user-generated strings that track Autocomplete (New) calls as
  "sessions." Autocomplete (New) uses session tokens to
  group the query and place selection phases of a user autocomplete search into a discrete session
  for billing purposes. Session tokens are passed into Place Details (New)
  calls that follow Autocomplete (New) calls. For more information, see
  [Session tokens](https://developers.google.com/maps/documentation/places/web-service/place-session-tokens).

## Place Details (New) example

The following example requests the details of a place by
`placeId`:  

```
curl -X GET -H 'Content-Type: application/json' \
-H "X-Goog-Api-Key: API_KEY" \
-H "X-Goog-FieldMask: id,displayName" \
https://places.googleapis.com/v1/places/ChIJj61dQgK6j4AR4GeTYWZsKWw
```

Note that the `X-Goog-FieldMask` header specifies that the
[response](https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places#Place)
contains the following data fields: `id,displayName`.
The response is then in the form:  

```json
{
  "id": "ChIJj61dQgK6j4AR4GeTYWZsKWw",
  "displayName": {
    "text": "Googleplex",
    "languageCode": "en"
  }
}
```

Add more data types to the field mask to return additional information.
For example, add `formattedAddress,plusCode` to include the
address and [Plus Code](https://maps.google.com/pluscodes/) in the
[response](https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places#Place):  

```
curl -X GET -H 'Content-Type: application/json' \
-H "X-Goog-Api-Key: API_KEY" \
-H "X-Goog-FieldMask: id,displayName,formattedAddress,plusCode" \
https://places.googleapis.com/v1/places/ChIJj61dQgK6j4AR4GeTYWZsKWw
```

The response is now in the form:  

```json
{
  "id": "ChIJj61dQgK6j4AR4GeTYWZsKWw",
  "formattedAddress": "1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA",
  "plusCode": {
    "globalCode": "849VCWC7+RW",
    "compoundCode": "CWC7+RW Mountain View, CA, USA"
  },
  "displayName": {
    "text": "Googleplex",
    "languageCode": "en"
  }
}
```

### Get address descriptors

Address descriptors provide relational information about a place's location, including nearby
landmarks and containing areas.
| **Note:** Address descriptors are generally available for customers in India and are experimental elsewhere. Places API requests that use only `addressDescriptor` in the field mask will be billed at [SKU: Places API Place Details Essentials](https://developers.google.com/maps/billing-and-pricing/overview#place-details-ess-sku).

The following example shows a Place Details (New) request for a department store
in a San Jose mall. In this example, you include `addressDescriptors`
in the field mask:  

```curl
  curl -X GET https://places.googleapis.com/v1/places/ChIJ8WvuSB7Lj4ARFyHppkxDRQ4 \
  -H 'Content-Type: application/json' -H "X-Goog-Api-Key: API_KEY" \
  -H "X-Goog-FieldMask: name,displayName,addressDescriptor"
```

The response includes the place specified in the request, a list of nearby landmarks and their
distance from the place, and a list of areas and their containment relationship to the
place:  

```json
  {
    "name": "places/ChIJ8WvuSB7Lj4ARFyHppkxDRQ4",
    "displayName": {
      "text": "Macy's",
      "languageCode": "en"
    },
    "addressDescriptor": {
      "landmarks": [
        {
          "name": "places/ChIJVVVVUB7Lj4ARXyb4HFVDV8s",
          "placeId": "ChIJVVVVUB7Lj4ARXyb4HFVDV8s",
          "displayName": {
            "text": "Westfield Valley Fair",
            "languageCode": "en"
          },
          "types": [
            "clothing_store",
            "department_store",
            "establishment",
            "food",
            "movie_theater",
            "point_of_interest",
            "restaurant",
            "shoe_store",
            "shopping_mall",
            "store"
          ],
          "spatialRelationship": "WITHIN",
          "straightLineDistanceMeters": 220.29175
        },
        {
          "name": "places/ChIJ62_oCR7Lj4AR_MGWkSPotD4",
          "placeId": "ChIJ62_oCR7Lj4AR_MGWkSPotD4",
          "displayName": {
            "text": "Nordstrom",
            "languageCode": "en"
          },
          "types": [
            "clothing_store",
            "department_store",
            "establishment",
            "point_of_interest",
            "shoe_store",
            "store"
          ],
          "straightLineDistanceMeters": 329.45178
        },
        {
          "name": "places/ChIJmx1c5x7Lj4ARJXJy_CU_JbE",
          "placeId": "ChIJmx1c5x7Lj4ARJXJy_CU_JbE",
          "displayName": {
            "text": "Monroe Parking Garage",
            "languageCode": "en"
          },
          "types": [
            "establishment",
            "parking",
            "point_of_interest"
          ],
          "straightLineDistanceMeters": 227.05153
        },
        {
          "name": "places/ChIJxcwBziHLj4ARUQLAvtzkRCM",
          "placeId": "ChIJxcwBziHLj4ARUQLAvtzkRCM",
          "displayName": {
            "text": "Studios Inn by Daiwa Living California Inc.",
            "languageCode": "en"
          },
          "types": [
            "establishment",
            "lodging",
            "point_of_interest",
            "real_estate_agency"
          ],
          "straightLineDistanceMeters": 299.9955
        },
        {
          "name": "places/ChIJWWIlNx7Lj4ARpe1E0ob-_GI",
          "placeId": "ChIJWWIlNx7Lj4ARpe1E0ob-_GI",
          "displayName": {
            "text": "Din Tai Fung",
            "languageCode": "en"
          },
          "types": [
            "establishment",
            "food",
            "point_of_interest",
            "restaurant"
          ],
          "straightLineDistanceMeters": 157.70943
        }
      ],
      "areas": [
        {
          "name": "places/ChIJb3F-EB7Lj4ARnHApQ_Hu1gI",
          "placeId": "ChIJb3F-EB7Lj4ARnHApQ_Hu1gI",
          "displayName": {
            "text": "Westfield Valley Fair",
            "languageCode": "en"
          },
          "containment": "WITHIN"
        },
        {
          "name": "places/ChIJXYuykB_Lj4AR1Ot8nU5q26Q",
          "placeId": "ChIJXYuykB_Lj4AR1Ot8nU5q26Q",
          "displayName": {
            "text": "Valley Fair",
            "languageCode": "en"
          },
          "containment": "WITHIN"
        },
        {
          "name": "places/ChIJtYoUX2DLj4ARKoKOb1G0CpM",
          "placeId": "ChIJtYoUX2DLj4ARKoKOb1G0CpM",
          "displayName": {
            "text": "Central San Jose",
            "languageCode": "en"
          },
          "containment": "WITHIN"
        }
      ]
    }
  }
```

### Get place details for a moved place

If a place referenced in your app has relocated, you can use the
`movedPlace` and `movedPlaceId` fields to get the details of the new place.

For places that are **permanently closed** , Place Details (New) returns `CLOSED_PERMANENTLY` in the
`businessStatus` field and omits the `movedPlace` and
`movedPlaceId` fields in the response body.

For places that have **moved to a new location** , Place Details (New) returns `CLOSED_PERMANENTLY` in the
`businessStatus` field and returns the new location in the `movedPlace` and
`movedPlaceId` fields of the response body.

For places that have **not moved** , Place Details (New) does not return
`movedPlace` or `movedPlaceId` in the response body.

The following example requests place information about Marche IGA St-Canut in Quebec, Canada:  

```
curl -X  GET -H 'Content-Type: application/json' \
-H 'x-Goog-Api-Key: API_KEY' \
-H 'X-Goog-FieldMask: id,displayName,businessStatus,movedPlace,movedPlaceId' \
https://places.googleapis.com/v1/places/ChIJUfQdGInVzkwRzAjmjzWB7CQ
```

The request returns the following response:  

```json
{
  "id": "ChIJUfQdGInVzkwRzAjmjzWB7CQ",
  "businessStatus": "CLOSED_PERMANENTLY",
  "displayName": {
    "text": "Marche IGA St-Canut",
    "languageCode": "en"
  },
  "movedPlace": "places/ChIJ36QT7n8qz0wRDqVZ_UBlUlQ",
  "movedPlaceId": "ChIJ36QT7n8qz0wRDqVZ_UBlUlQ"
}
```

To request details about the new place, use the Place resource name in the `movedPlace` field
in a new Place Details (New) request.

For places that have **relocated multiple times** , getting details about the current location
may require multiple chained Place Details (New) requests. The `movedPlace` and
`movedPlaceId` fields of a place result only point to the next location, not the last
known location. A place is in its **current location** if a Place Details (New) request
omits the `movedPlace` and `movedPlaceId` fields in the response body.

## Try it!

The APIs Explorer lets you make sample requests so
that you can get familiar with the API and the API options.

1. Select the API icon api
   on the right side of the page.

2. Optionally edit the request parameters.

3. Select the **Execute** button. In the dialog, choose the account
   that you want to use to make the request.

4. In the APIs Explorer panel, select the fullscreen icon
   fullscreen to expand the APIs Explorer window.