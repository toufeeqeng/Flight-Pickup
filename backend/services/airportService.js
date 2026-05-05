const cache = require('./cache');
const axios = require('axios');

const AIRPORTS_DB = [
  {iata:'ATL',name:'Hartsfield-Jackson Atlanta Intl',city:'Atlanta',country:'USA',lat:33.640,lng:-84.427},
  {iata:'LAX',name:'Los Angeles International',city:'Los Angeles',country:'USA',lat:33.942,lng:-118.408},
  {iata:'ORD',name:"O'Hare International",city:'Chicago',country:'USA',lat:41.974,lng:-87.907},
  {iata:'DFW',name:'Dallas Fort Worth International',city:'Dallas',country:'USA',lat:32.899,lng:-97.040},
  {iata:'DEN',name:'Denver International',city:'Denver',country:'USA',lat:39.856,lng:-104.673},
  {iata:'JFK',name:'John F Kennedy International',city:'New York',country:'USA',lat:40.641,lng:-73.778},
  {iata:'LGA',name:'LaGuardia Airport',city:'New York',country:'USA',lat:40.777,lng:-73.873},
  {iata:'EWR',name:'Newark Liberty International',city:'Newark',country:'USA',lat:40.689,lng:-74.174},
  {iata:'SFO',name:'San Francisco International',city:'San Francisco',country:'USA',lat:37.621,lng:-122.379},
  {iata:'SEA',name:'Seattle-Tacoma International',city:'Seattle',country:'USA',lat:47.450,lng:-122.308},
  {iata:'LAS',name:'Harry Reid International',city:'Las Vegas',country:'USA',lat:36.084,lng:-115.153},
  {iata:'MCO',name:'Orlando International',city:'Orlando',country:'USA',lat:28.431,lng:-81.308},
  {iata:'MIA',name:'Miami International',city:'Miami',country:'USA',lat:25.795,lng:-80.287},
  {iata:'FLL',name:'Fort Lauderdale Hollywood Intl',city:'Fort Lauderdale',country:'USA',lat:26.072,lng:-80.152},
  {iata:'CLT',name:'Charlotte Douglas International',city:'Charlotte',country:'USA',lat:35.214,lng:-80.943},
  {iata:'PHX',name:'Phoenix Sky Harbor International',city:'Phoenix',country:'USA',lat:33.437,lng:-112.007},
  {iata:'IAH',name:'George Bush Intercontinental',city:'Houston',country:'USA',lat:29.990,lng:-95.336},
  {iata:'HOU',name:'William P Hobby Airport',city:'Houston',country:'USA',lat:29.645,lng:-95.278},
  {iata:'BOS',name:'Boston Logan International',city:'Boston',country:'USA',lat:42.365,lng:-71.009},
  {iata:'MSP',name:'Minneapolis Saint Paul Intl',city:'Minneapolis',country:'USA',lat:44.884,lng:-93.222},
  {iata:'DTW',name:'Detroit Metropolitan Airport',city:'Detroit',country:'USA',lat:42.216,lng:-83.355},
  {iata:'PHL',name:'Philadelphia International',city:'Philadelphia',country:'USA',lat:39.874,lng:-75.242},
  {iata:'IAD',name:'Washington Dulles International',city:'Washington DC',country:'USA',lat:38.953,lng:-77.456},
  {iata:'DCA',name:'Ronald Reagan Washington National',city:'Washington DC',country:'USA',lat:38.852,lng:-77.037},
  {iata:'BWI',name:'Baltimore Washington International',city:'Baltimore',country:'USA',lat:39.175,lng:-76.668},
  {iata:'MDW',name:'Chicago Midway International',city:'Chicago',country:'USA',lat:41.786,lng:-87.752},
  {iata:'SLC',name:'Salt Lake City International',city:'Salt Lake City',country:'USA',lat:40.788,lng:-111.977},
  {iata:'PDX',name:'Portland International',city:'Portland',country:'USA',lat:45.589,lng:-122.595},
  {iata:'SAN',name:'San Diego International',city:'San Diego',country:'USA',lat:32.733,lng:-117.193},
  {iata:'TPA',name:'Tampa International',city:'Tampa',country:'USA',lat:27.975,lng:-82.533},
  {iata:'BNA',name:'Nashville International',city:'Nashville',country:'USA',lat:36.124,lng:-86.678},
  {iata:'AUS',name:'Austin Bergstrom International',city:'Austin',country:'USA',lat:30.197,lng:-97.666},
  {iata:'SAT',name:'San Antonio International',city:'San Antonio',country:'USA',lat:29.533,lng:-98.469},
  {iata:'STL',name:'St Louis Lambert International',city:'St Louis',country:'USA',lat:38.748,lng:-90.370},
  {iata:'MCI',name:'Kansas City International',city:'Kansas City',country:'USA',lat:39.297,lng:-94.713},
  {iata:'OAK',name:'Oakland International',city:'Oakland',country:'USA',lat:37.721,lng:-122.220},
  {iata:'SJC',name:'San Jose International',city:'San Jose',country:'USA',lat:37.362,lng:-121.929},
  {iata:'SMF',name:'Sacramento International',city:'Sacramento',country:'USA',lat:38.695,lng:-121.590},
  {iata:'RDU',name:'Raleigh Durham International',city:'Raleigh',country:'USA',lat:35.877,lng:-78.787},
  {iata:'MEM',name:'Memphis International',city:'Memphis',country:'USA',lat:35.042,lng:-89.976},
  {iata:'PIT',name:'Pittsburgh International',city:'Pittsburgh',country:'USA',lat:40.491,lng:-80.232},
  {iata:'CLE',name:'Cleveland Hopkins International',city:'Cleveland',country:'USA',lat:41.411,lng:-81.849},
  {iata:'CMH',name:'John Glenn Columbus International',city:'Columbus',country:'USA',lat:39.998,lng:-82.891},
  {iata:'MKE',name:'Milwaukee Mitchell International',city:'Milwaukee',country:'USA',lat:42.947,lng:-87.896},
  {iata:'JAX',name:'Jacksonville International',city:'Jacksonville',country:'USA',lat:30.494,lng:-81.687},
  {iata:'MSY',name:'Louis Armstrong New Orleans Intl',city:'New Orleans',country:'USA',lat:29.993,lng:-90.258},
  {iata:'OKC',name:'Will Rogers World Airport',city:'Oklahoma City',country:'USA',lat:35.393,lng:-97.600},
  {iata:'TUL',name:'Tulsa International',city:'Tulsa',country:'USA',lat:36.198,lng:-95.888},
  {iata:'ABQ',name:'Albuquerque International Sunport',city:'Albuquerque',country:'USA',lat:35.040,lng:-106.609},
  {iata:'TUS',name:'Tucson International',city:'Tucson',country:'USA',lat:32.116,lng:-110.941},
  {iata:'ELP',name:'El Paso International',city:'El Paso',country:'USA',lat:31.807,lng:-106.377},
  {iata:'BHM',name:'Birmingham Shuttlesworth Intl',city:'Birmingham',country:'USA',lat:33.562,lng:-86.753},
  {iata:'BOI',name:'Boise Airport',city:'Boise',country:'USA',lat:43.564,lng:-116.222},
  {iata:'GRR',name:'Gerald R Ford International',city:'Grand Rapids',country:'USA',lat:42.880,lng:-85.522},
  {iata:'GSP',name:'Greenville Spartanburg International',city:'Greenville',country:'USA',lat:34.895,lng:-82.218},
  {iata:'CHS',name:'Charleston International',city:'Charleston',country:'USA',lat:32.898,lng:-80.040},
  {iata:'SAV',name:'Savannah Hilton Head International',city:'Savannah',country:'USA',lat:32.127,lng:-81.202},
  {iata:'BUF',name:'Buffalo Niagara International',city:'Buffalo',country:'USA',lat:42.940,lng:-78.732},
  {iata:'ALB',name:'Albany International',city:'Albany',country:'USA',lat:42.748,lng:-73.801},
  {iata:'SYR',name:'Syracuse Hancock International',city:'Syracuse',country:'USA',lat:43.111,lng:-76.106},
  {iata:'ROC',name:'Greater Rochester International',city:'Rochester',country:'USA',lat:43.118,lng:-77.672},
  {iata:'PVD',name:'TF Green International',city:'Providence',country:'USA',lat:41.724,lng:-71.428},
  {iata:'ORF',name:'Norfolk International',city:'Norfolk',country:'USA',lat:36.897,lng:-76.012},
  {iata:'RIC',name:'Richmond International',city:'Richmond',country:'USA',lat:37.505,lng:-77.319},
  {iata:'HNL',name:'Daniel K Inouye International',city:'Honolulu',country:'USA',lat:21.318,lng:-157.922},
  {iata:'OGG',name:'Kahului Airport',city:'Maui',country:'USA',lat:20.898,lng:-156.430},
  {iata:'ANC',name:'Ted Stevens Anchorage International',city:'Anchorage',country:'USA',lat:61.174,lng:-149.998},
  {iata:'SJU',name:'Luis Munoz Marin International',city:'San Juan',country:'Puerto Rico',lat:18.439,lng:-66.001},
  {iata:'LHR',name:'Heathrow Airport',city:'London',country:'UK',lat:51.477,lng:-0.461},
  {iata:'LGW',name:'Gatwick Airport',city:'London',country:'UK',lat:51.148,lng:-0.190},
  {iata:'STN',name:'Stansted Airport',city:'London',country:'UK',lat:51.885,lng:0.235},
  {iata:'MAN',name:'Manchester Airport',city:'Manchester',country:'UK',lat:53.353,lng:-2.275},
  {iata:'BHX',name:'Birmingham Airport',city:'Birmingham',country:'UK',lat:52.453,lng:-1.748},
  {iata:'GLA',name:'Glasgow Airport',city:'Glasgow',country:'UK',lat:55.871,lng:-4.433},
  {iata:'EDI',name:'Edinburgh Airport',city:'Edinburgh',country:'UK',lat:55.950,lng:-3.372},
  {iata:'DXB',name:'Dubai International',city:'Dubai',country:'UAE',lat:25.253,lng:55.365},
  {iata:'AUH',name:'Abu Dhabi International',city:'Abu Dhabi',country:'UAE',lat:24.433,lng:54.651},
  {iata:'SHJ',name:'Sharjah International',city:'Sharjah',country:'UAE',lat:25.328,lng:55.517},
  {iata:'RKT',name:'Ras Al Khaimah International',city:'Ras Al Khaimah',country:'UAE',lat:25.613,lng:55.938},
  {iata:'FJR',name:'Fujairah International',city:'Fujairah',country:'UAE',lat:25.112,lng:56.323},
  {iata:'DOH',name:'Hamad International',city:'Doha',country:'Qatar',lat:25.273,lng:51.608},
  {iata:'KWI',name:'Kuwait International',city:'Kuwait City',country:'Kuwait',lat:29.226,lng:47.968},
  {iata:'BAH',name:'Bahrain International',city:'Manama',country:'Bahrain',lat:26.270,lng:50.633},
  {iata:'MCT',name:'Muscat International',city:'Muscat',country:'Oman',lat:23.593,lng:58.284},
  {iata:'RUH',name:'King Khalid International',city:'Riyadh',country:'Saudi Arabia',lat:24.957,lng:46.698},
  {iata:'JED',name:'King Abdulaziz International',city:'Jeddah',country:'Saudi Arabia',lat:21.679,lng:39.156},
  {iata:'MED',name:'Prince Mohammad Bin Abdulaziz',city:'Madinah',country:'Saudi Arabia',lat:24.553,lng:39.705},
  {iata:'DMM',name:'King Fahd International',city:'Dammam',country:'Saudi Arabia',lat:26.471,lng:49.797},
  {iata:'AMM',name:'Queen Alia International',city:'Amman',country:'Jordan',lat:31.722,lng:35.993},
  {iata:'BEY',name:'Rafic Hariri International',city:'Beirut',country:'Lebanon',lat:33.820,lng:35.488},
  {iata:'TLV',name:'Ben Gurion International',city:'Tel Aviv',country:'Israel',lat:32.011,lng:34.886},
  {iata:'DEL',name:'Indira Gandhi International',city:'Delhi',country:'India',lat:28.566,lng:77.103},
  {iata:'BOM',name:'Chhatrapati Shivaji International',city:'Mumbai',country:'India',lat:19.089,lng:72.865},
  {iata:'BLR',name:'Kempegowda International',city:'Bangalore',country:'India',lat:13.197,lng:77.706},
  {iata:'MAA',name:'Chennai International',city:'Chennai',country:'India',lat:12.990,lng:80.169},
  {iata:'HYD',name:'Rajiv Gandhi International',city:'Hyderabad',country:'India',lat:17.240,lng:78.429},
  {iata:'CCU',name:'Netaji Subhas Chandra Bose Intl',city:'Kolkata',country:'India',lat:22.652,lng:88.446},
  {iata:'COK',name:'Cochin International',city:'Kochi',country:'India',lat:10.152,lng:76.401},
  {iata:'AMD',name:'Sardar Vallabhbhai Patel Intl',city:'Ahmedabad',country:'India',lat:23.077,lng:72.634},
  {iata:'PNQ',name:'Pune Airport',city:'Pune',country:'India',lat:18.582,lng:73.919},
  {iata:'GOI',name:'Goa International',city:'Goa',country:'India',lat:15.380,lng:73.831},
  {iata:'JAI',name:'Jaipur International',city:'Jaipur',country:'India',lat:26.824,lng:75.812},
  {iata:'LKO',name:'Chaudhary Charan Singh Intl',city:'Lucknow',country:'India',lat:26.760,lng:80.889},
  {iata:'TRV',name:'Trivandrum International',city:'Thiruvananthapuram',country:'India',lat:8.482,lng:76.920},
  {iata:'SXR',name:'Sheikh ul Alam International',city:'Srinagar',country:'India',lat:33.987,lng:74.774},
  {iata:'IXC',name:'Chandigarh Airport',city:'Chandigarh',country:'India',lat:30.673,lng:76.788},
  {iata:'KHI',name:'Jinnah International',city:'Karachi',country:'Pakistan',lat:24.906,lng:67.160},
  {iata:'LHE',name:'Allama Iqbal International',city:'Lahore',country:'Pakistan',lat:31.521,lng:74.403},
  {iata:'ISB',name:'Islamabad International',city:'Islamabad',country:'Pakistan',lat:33.616,lng:73.099},
  {iata:'PEW',name:'Bacha Khan International',city:'Peshawar',country:'Pakistan',lat:33.993,lng:71.514},
  {iata:'MUX',name:'Multan International',city:'Multan',country:'Pakistan',lat:30.203,lng:71.419},
  {iata:'SKT',name:'Sialkot International',city:'Sialkot',country:'Pakistan',lat:32.535,lng:74.363},
  {iata:'DAC',name:'Hazrat Shahjalal International',city:'Dhaka',country:'Bangladesh',lat:23.843,lng:90.397},
  {iata:'CMB',name:'Bandaranaike International',city:'Colombo',country:'Sri Lanka',lat:7.180,lng:79.884},
  {iata:'KTM',name:'Tribhuvan International',city:'Kathmandu',country:'Nepal',lat:27.696,lng:85.359},
  {iata:'MLE',name:'Velana International',city:'Male',country:'Maldives',lat:4.191,lng:73.529},
  {iata:'CDG',name:'Charles de Gaulle Airport',city:'Paris',country:'France',lat:49.009,lng:2.547},
  {iata:'ORY',name:'Paris Orly Airport',city:'Paris',country:'France',lat:48.723,lng:2.379},
  {iata:'AMS',name:'Amsterdam Schiphol',city:'Amsterdam',country:'Netherlands',lat:52.310,lng:4.768},
  {iata:'FRA',name:'Frankfurt Airport',city:'Frankfurt',country:'Germany',lat:50.037,lng:8.562},
  {iata:'MUC',name:'Munich Airport',city:'Munich',country:'Germany',lat:48.353,lng:11.775},
  {iata:'MAD',name:'Adolfo Suarez Madrid Barajas',city:'Madrid',country:'Spain',lat:40.471,lng:-3.562},
  {iata:'BCN',name:'Barcelona El Prat',city:'Barcelona',country:'Spain',lat:41.297,lng:2.078},
  {iata:'FCO',name:'Leonardo da Vinci Fiumicino',city:'Rome',country:'Italy',lat:41.799,lng:12.246},
  {iata:'IST',name:'Istanbul Airport',city:'Istanbul',country:'Turkey',lat:41.260,lng:28.741},
  {iata:'ZRH',name:'Zurich Airport',city:'Zurich',country:'Switzerland',lat:47.464,lng:8.549},
  {iata:'VIE',name:'Vienna International',city:'Vienna',country:'Austria',lat:48.110,lng:16.569},
  {iata:'SIN',name:'Singapore Changi Airport',city:'Singapore',country:'Singapore',lat:1.364,lng:103.991},
  {iata:'KUL',name:'Kuala Lumpur International',city:'Kuala Lumpur',country:'Malaysia',lat:2.745,lng:101.709},
  {iata:'BKK',name:'Suvarnabhumi Airport',city:'Bangkok',country:'Thailand',lat:13.681,lng:100.747},
  {iata:'HKG',name:'Hong Kong International',city:'Hong Kong',country:'China',lat:22.308,lng:113.918},
  {iata:'PEK',name:'Beijing Capital International',city:'Beijing',country:'China',lat:40.079,lng:116.603},
  {iata:'PVG',name:'Shanghai Pudong International',city:'Shanghai',country:'China',lat:31.144,lng:121.808},
  {iata:'NRT',name:'Narita International',city:'Tokyo',country:'Japan',lat:35.764,lng:140.386},
  {iata:'HND',name:'Haneda Airport',city:'Tokyo',country:'Japan',lat:35.549,lng:139.779},
  {iata:'ICN',name:'Incheon International',city:'Seoul',country:'South Korea',lat:37.460,lng:126.440},
  {iata:'SYD',name:'Sydney Kingsford Smith',city:'Sydney',country:'Australia',lat:-33.939,lng:151.175},
  {iata:'MEL',name:'Melbourne Airport',city:'Melbourne',country:'Australia',lat:-37.669,lng:144.841},
  {iata:'CAI',name:'Cairo International',city:'Cairo',country:'Egypt',lat:30.121,lng:31.405},
  {iata:'JNB',name:'OR Tambo International',city:'Johannesburg',country:'South Africa',lat:-26.139,lng:28.246},
  {iata:'NBO',name:'Jomo Kenyatta International',city:'Nairobi',country:'Kenya',lat:-1.319,lng:36.927},
  {iata:'LOS',name:'Murtala Muhammed International',city:'Lagos',country:'Nigeria',lat:6.577,lng:3.321},
  {iata:'ADD',name:'Addis Ababa Bole International',city:'Addis Ababa',country:'Ethiopia',lat:8.977,lng:38.799},
  {iata:'YYZ',name:'Toronto Pearson International',city:'Toronto',country:'Canada',lat:43.677,lng:-79.630},
  {iata:'YVR',name:'Vancouver International',city:'Vancouver',country:'Canada',lat:49.196,lng:-123.181},
  {iata:'GRU',name:'Sao Paulo Guarulhos International',city:'Sao Paulo',country:'Brazil',lat:-23.435,lng:-46.473},
  {iata:'MEX',name:'Benito Juarez International',city:'Mexico City',country:'Mexico',lat:19.436,lng:-99.072},
  {iata:'TPE',name:'Taiwan Taoyuan International',city:'Taipei',country:'Taiwan',lat:25.077,lng:121.232},
];

function searchAirportsLive(q) {
  const s = q.toLowerCase().trim();
  const found = AIRPORTS_DB.filter(a =>
    a.iata.toLowerCase().startsWith(s) ||
    a.city.toLowerCase().includes(s) ||
    a.name.toLowerCase().includes(s) ||
    a.country.toLowerCase().includes(s)
  ).slice(0, 8);
  return Promise.resolve(found);
}

async function getAirportByIata(iata) {
  const cacheKey = `iata_${iata}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  try {
    const res = await axios.get(`https://api.api-ninjas.com/v1/airports?iata=${iata}`, {
      headers: { 'X-Api-Key': process.env.NINJAS_API_KEY || '' }
    });
    const a = (res.data || [])[0];
    if (!a) return null;
    const result = {
      iata: a.iata.toUpperCase(),
      name: a.name || '',
      city: a.city || '',
      country: a.country || '',
      lat: parseFloat(a.latitude) || 0,
      lng: parseFloat(a.longitude) || 0,
      photo: `${a.city} ${a.country} airport`
    };
    cache.set(cacheKey, result, 86400);
    return result;
  } catch (e) {
    return null;
  }
}

module.exports = { AIRPORTS_DB, searchAirportsLive, getAirportByIata };
