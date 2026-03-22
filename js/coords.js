/* ===== Restaurant Coordinates =====
   Keyed by exact Name field from CSV.
   2 entries use coordinates found in the CSV data itself;
   the rest are best-known approximations from street addresses/marina locations.
*/
const RESTAURANT_COORDS = {
  "Slipaway Food Truck Park & Marina":               [26.5611, -81.9455],
  "The Helm Bar at Slipaway":                        [26.5613, -81.9456],
  "Bimini Basin Seafood & Cocktails":                [26.5693, -81.9829],
  "Rumrunners":                                      [26.5340, -81.9948],
  "Fathoms Restaurant & Bar":                        [26.5338, -81.9952],
  "Cape Harbour Oyster Bar & Grill":                 [26.5337, -81.9951],
  "The French Press":                                [26.5339, -81.9950],
  "Gather":                                          [26.5407, -82.0001],
  "Marker 92 Waterfront Bar & Bistro":               [26.5401, -81.9997], // exact from CSV
  "The Nauti Mermaid Dockside Bar & Grill":          [26.5601, -81.9415],
  "Miceli's Restaurant":                                                    [26.6286, -82.0736],
  "The Boathouse Tiki Bar & Grill":                                         [26.6180, -81.9750],
  "Pinchers Crab Shack":                                                    [26.5800, -81.9600],
  "Cabbage Key Inn":                                                        [26.6008, -82.1258],
  "Tarpon Lodge & Restaurant":                                              [26.6775, -82.1317],
  "Lazy Flamingo (Lazy Flamingo 3)":                                        [26.7200, -82.1500],
  "Phuzzy's Waterside (formerly Woody's Waterside)":                        [26.5500, -82.0900],
  "Mainstay North Captiva (formerly Barnacles / Barnacles Bar retained)":   [26.6200, -82.2100],
  "Gramma Dot's Seaside Saloon":                                            [26.4487, -82.0127],
  "Doc Ford's Rum Bar & Grille":                                            [26.4513, -81.9422],
  "On the Bay (formerly Matanzas on the Bay)":                              [26.4478, -81.9478],
  "Salty Sam's Marina (Parrot Key Caribbean Grill)":                        [26.4400, -81.9552],
  "Marina Cantina Waterfront Tin Tiki":                                     [26.4402, -81.9554],
  "Flipper's on the Bay":                                                   [26.4063, -81.8763], // exact from CSV
  "Nervous Nellie's":                                                       [26.4490, -81.9430],
  "Bonita Fish Company (formerly Bonita Bill's Waterfront Cafe)":           [26.4350, -81.9270],
  "Lani Kai Island Resort":                                                 [26.4513, -81.9486],
  "Eats at the Beach (formerly Wicked Wings)":                              [26.4500, -81.9460],
  "DiamondHead Beach Resort":                                               [26.4510, -81.9470],
  "The Beach Bar (formerly Beach Pub)":                                     [26.4495, -81.9450],
  "Lighthouse Waterfront Restaurant":                                       [26.4677, -81.9656],
  "Fort Myers Yacht Basin (Free Public Docking)":                           [26.6425, -81.8795],
  "Oxbow Bar & Grill":                                                      [26.6426, -81.8797],
  "Legacy Harbour Marina":                                                  [26.6448, -81.8819],
  "Three Fishermen Seafood Restaurant":                                     [26.7050, -81.9000],
  "Sunset Harbor Village Marina":                                           [26.6900, -81.8800],
  "Snook Bight Marina Restaurants (Junkanoo Below Deck / Fresh Catch Bistro)": [26.4380, -81.9330],
};

// Area bounding boxes for flyTo — [lat, lng, zoom]
const AREA_VIEWS = {
  "cape-coral":        [26.5630, -81.9800, 12],
  "fort-myers-beach":  [26.4450, -81.9450, 13],
  "fort-myers":        [26.6440, -81.8800, 13],
  "pine-island":       [26.6400, -82.1200, 11],
  "captiva":           [26.5200, -82.1800, 11],
};
