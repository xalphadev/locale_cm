import StayMapView from '../StayMapView';
import StayFilterSheet from '../StayFilterSheet';
import { loadStay } from '../query';
import { loadStayFacets } from '@/lib/amenities';

export const dynamic = 'force-dynamic';

// Full-screen map as its OWN route (Booking/Agoda pattern): edge-to-edge map + price pins + the
// pin-synced bottom card carousel, sharing ALL search params with /stay so list↔map is one search.
export default async function StayMap({ searchParams }: { searchParams: Record<string, string> }) {
  const d = await loadStay(searchParams);
  const facets = await loadStayFacets();
  const { mode, kind, sort, am, fr, qtext, pr, beds, gender, bam, online, focus, pins, placeList, activeCount, href, dateQs } = d;
  return (
    <StayMapView pins={pins} focus={focus} full backHref={href({}, '/stay/search')} qs={dateQs}>
      <div className="mapcount-pill">พบ {placeList.length} ที่พัก</div>
      <StayFilterSheet mode={mode} q={qtext} kind={kind} sort={sort} am={am} fr={fr} pr={pr} beds={beds} gender={gender} bam={bam} online={online} count={activeCount} from={d.fromQ as string} to={d.toQ as string} basePath="/stay/map" amenOpts={facets.amenity} buildOpts={facets.building} />
    </StayMapView>
  );
}
