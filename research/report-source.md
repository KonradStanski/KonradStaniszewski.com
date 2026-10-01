# Canonical research source and claim ledger

**Project:** BC adventure-moto route discovery map  
**Research cutoff:** 2026-09-07  
**Purpose:** internal provenance record for `bc-adventure-moto-route-inventory.md`

## Scope and method

The user requested a deep pre-mapping survey of BDR-style adventure-motorcycle routes, including fragments and non-maintained lines, focused on the Lower Mainland, Vancouver Island, and the Canadian Rockies. Three independent regional research lanes covered:

- Lower Mainland, Fraser Valley, Sea-to-Sky, and Sunshine Coast: 19 records.
- Vancouver Island: 25 records.
- Kootenays, Interior, and Canadian Rockies: 25 records.

The synthesis prioritizes sources in this order:

1. Current land-manager, government, park, regulation, emergency, and road-condition sources.
2. Route owner, local motorcycle club, or named-route organizer.
3. Current specialist condition tracker or trip report.
4. Older forum posts, general tourism, bicycle, and community route sources, used only for discovery/context.

Important route claims were checked against a second source where available. The artifact does not treat a route publisher’s GPX as evidence of current legality or passability.

## High-level findings and primary sources

| Claim | Resolution | Primary source |
| --- | --- | --- |
| An official BC BDR exists today. | **False.** BCBDR is in development and expected in coming years. | https://ridebdr.com/canadian-discovery-routes/ |
| ARC provides a current national/provincial route map and GPX. | **True**, but reuse is legally unclear for this project. | https://canada-arc.ca/map-routes/ and https://canada-arc.ca/british-columbia/ |
| ARC official tracks can be republished. | **Contradictory.** Etiquette says official tracks may be shared; download terms prohibit publishing/reproduction/extraction/derivatives. Use link-only pending written permission. | https://canada-arc.ca/arc-etiquette/ and https://canada-arc.ca/british-columbia/ |
| TCAT is the established BC long-distance backbone. | **True historically.** BC overview describes approximately 3,500 km and a loaded-big-bike concept; current line needs audit. | https://www.graveltravel.ca/index.php?Itemid=71&catid=1&id=88%3Atcat-bc1&option=com_content&view=article |
| TCAT GPX can be copied into the project. | **No permission established.** Current download page lists CAD $25 and asks users not to share. Link-only. | https://www.graveltravel.ca/index.php?Itemid=144&id=115&option=com_content&view=article |
| Gray Creek was simply “closed” at the cutoff. | **Too broad.** Latest official notice closed Redding Creek at km 61.3 until approximately 2026-09-04 17:00 and left Gray Creek open to the summit. It did not explicitly confirm completion. Status is verify, not closed or confirmed-open. | https://www2.gov.bc.ca/gov/content/industry/natural-resource-use/resource-roads/local-road-safety-information/selkirk-natural-resource-district-road-safety-information |
| KVR can be drawn as a continuous moto route. | **False.** Access rules vary by segment; several parts are non-motorized, and the Princeton–Coquihalla damaged section is closed/decommissioning. | https://archive.news.gov.bc.ca/releases/news_releases_2024-2028/2026ENV0029-000723.htm and https://www.rdos.bc.ca/assets/COMMS-2025/Kettle-Valley-Rail-Trail-Track-Access-Restrictions-Map-V6.pdf |
| Mosaic roads visible on a base map imply public moto access. | **False.** Access is limited by the current gate map, designated times/locations, and club agreements. Plated dual-sport treatment is not explicit in the public FAQ. | https://www.mosaicforests.com/access |
| Public OSM tiles are an appropriate free production backend. | **False.** OSM’s public tile service has limited capacity, no SLA, and restrictions including bulk/offline use. | https://operations.osmfoundation.org/policies/tiles/ |

## Official operational source stack

- BC resource-road district hub: https://www2.gov.bc.ca/gov/content/industry/natural-resource-use/resource-roads/local-road-safety-information
- Chilliwack district: https://www2.gov.bc.ca/gov/content/industry/natural-resource-use/resource-roads/local-road-safety-information/chilliwack-natural-resource-district-district-road-safety-information
- Sea-to-Sky district: https://www2.gov.bc.ca/gov/content/industry/natural-resource-use/resource-roads/local-road-safety-information/sea-to-sky-natural-resource-district-road-safety-information/road-conditions-in-sea-to-sky-district
- Selkirk district: https://www2.gov.bc.ca/gov/content/industry/natural-resource-use/resource-roads/local-road-safety-information/selkirk-natural-resource-district-road-safety-information
- Rocky Mountain district: https://www2.gov.bc.ca/gov/content/industry/natural-resource-use/resource-roads/local-road-safety-information/rocky-mountain-natural-resource-district-road-safety-information
- North Island–Central Coast and South Island district pages: linked from the district hub.
- Resource-road radio guidance/maps: https://www2.gov.bc.ca/gov/content/industry/natural-resource-use/resource-roads/radio-communications
- RSTBC: https://www.sitesandtrailsbc.ca/ and https://www2.gov.bc.ca/gov/content?id=F5F42615F5714F2698FD94D5D0579EF5
- BC Parks trip map: https://bcparks.ca/plan-your-trip/maps/
- BC Wildfire map: https://wildfiresituation.nrs.gov.bc.ca/map?featureType=British_Columbia_Bans_and_Prohibition_Areas
- Open511 active events: https://api.open511.gov.bc.ca/events?format=kml&status=ACTIVE
- Mosaic current access: https://www.mosaicforests.com/access
- Alberta PLUZ regulations/maps/closures: https://www.alberta.ca/public-land-use-zones-regulations, https://www.alberta.ca/public-land-recreation-maps, https://www.alberta.ca/public-land-closures
- Parks Canada Banff/Jasper road-use rules: https://www.parks.canada.ca/pn-np/ab/banff/securite-safety/regles-rules and https://parks.canada.ca/pn-np/ab/jasper/securite-safety/regles-rules

## Route-owner and specialist source stack

- ARC: https://canada-arc.ca/map-routes/
- Gravel Travel / TCAT: https://www.graveltravel.ca/
- TCAT 2026 field audit: https://ithinkwemissedaturn.com/pages/tcat-2026
- VIGL: https://vancouverislandgrandloop.com/
- North Island 1000: https://northisland1000.com/
- EVADRS: https://www.evadrs.ca/maps-2
- Backroad Status: https://backroadstatus.com/
- Untrammelled Travels: https://www.untrammelledtravels.ca/interactive-map
- DualSportBC: https://forum.dualsportbc.com/forums/british-columbia-adventure-routes.49/
- VIDRA: https://dirtrider.ca/live/
- Fraser Valley Dirt Riders: https://www.fvdra.com/riding-areas
- Don’s Adventure Rides: https://donsadventurerides.wordpress.com/
- I Survived the Hurley: https://isurvivedthehurley.com/
- Koocanusa Recreation Strategy: https://www.koocanusarecreation.ca/
- Backroad Mapbooks: https://backroadmapbooks.com/collections/brmb-maps-app-web-map
- That Moto App: https://www.thatmotoapp.com/

## Geometry and data-source leads

- BC government recreation trails service endpoint: https://delivery.maps.gov.bc.ca/arcgis/rest/services/mpcm/bcgwpub/MapServer/404
- BC government forest-tenure/road-related map service: https://delivery.maps.gov.bc.ca/arcgis/rest/services/whse/bcgw_pub_whse_forest_tenure/MapServer
- MapLibre GL JS: https://maplibre.org/maplibre-gl-js/docs/
- OpenFreeMap: https://openfreemap.org/
- PMTiles / MapLibre integration: https://docs.protomaps.com/pmtiles/maplibre
- OSM public tile policy: https://operations.osmfoundation.org/policies/tiles/

Government service metadata and its applicable Open Government Licence still need to be recorded per layer before ingestion. An accessible endpoint is not, by itself, the complete licence record.

## Contradictions and conservative resolutions

1. **ARC sharing:** public etiquette and binding download terms conflict. Resolution: link-only and ask ARC.
2. **TCAT price/availability:** old pages describe free files; the current GPS page requests CAD $25 and non-sharing. Resolution: current page wins.
3. **Gray Creek:** an earlier state was described as closed; the latest official notice scheduled repair completion but did not publish a clear post-work opening. Resolution: `verify`, with west-side-to-summit access distinguished from through travel.
4. **Harrison East/Kookipi:** 2025/2026 reports and official emergency guidance disagree on practical through passability. Resolution: show corridor plus caution, never `open` without a fresh district check.
5. **Mosaic vehicle class:** ATV restrictions are explicit; plated dual-sport access is not. Resolution: do not infer and request clarification.
6. **Route geometry versus legality:** bicycle, event, historic forum, and OSM linework often prove that a corridor exists but not that a motorcycle may use it. Resolution: candidate/research-lead only until motor-use evidence exists.

## Remaining evidence gaps before precise mapping

- Written route/GPX reuse positions from ARC, Gravel Travel, VIGL, North Island 1000, EVADRS, Backroad Status, and Trailforks.
- Geometry-level overlay of First Nation reserve closures, private land, parks, wildlife motor-vehicle prohibitions, and road tenures.
- Same-day confirmation for Gray Creek, Kookipi, Harrison East north end, Tahsis–Zeballos connectors, and every road currently affected by fire/repair.
- Clear landowner answer on plated dual-sport access to Mosaic-managed private roads.
- Legal/motorized review of Powell River Lakes, Hartley Pass, and bicycle-derived research corridors.
- Field or club verification for older southern-Island Don’s routes and Douglas Lake Road.
- Definition of the audience’s “big ADV” threshold so technical alternatives can be filtered consistently.

## Stopping rule

Research stopped after 69 useful regional records because new searches increasingly repeated existing corridors, returned short generic FSR spurs, or relied on stale/non-motorized sources. The next value step is geometry-level legal reconciliation and publisher permission—not more broad route discovery.
