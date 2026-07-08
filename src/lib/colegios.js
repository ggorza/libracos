// Busca un colegio existente por cercanía geográfica o por osm_place_id.
// Si no existe, lo crea. Devuelve el id del colegio (o null si falla).
export async function buscarOCrearColegio(supabase, lugar) {
  // 1. ¿Existe ya por su osm_place_id exacto?
  const { data: porPlaceId } = await supabase
    .from('colegios')
    .select('id')
    .eq('osm_place_id', lugar.osm_place_id)
    .maybeSingle()

  if (porPlaceId) return porPlaceId.id

  // 2. ¿Existe uno en prácticamente las mismas coordenadas? (~11 metros)
  // Redondeamos a 4 decimales y buscamos en un rango chico alrededor.
  const margen = 0.0005 // ~55 metros de tolerancia
  const { data: cercanos } = await supabase
    .from('colegios')
    .select('id, lat, lon')
    .gte('lat', lugar.lat - margen)
    .lte('lat', lugar.lat + margen)
    .gte('lon', lugar.lon - margen)
    .lte('lon', lugar.lon + margen)

  if (cercanos && cercanos.length > 0) {
    // Ya hay un colegio en ese punto: reusamos el primero
    return cercanos[0].id
  }

  // 3. No existe: lo creamos
  const { data: nuevo, error } = await supabase
    .from('colegios')
    .insert({
      osm_place_id: lugar.osm_place_id,
      nombre: lugar.nombre,
      direccion: lugar.direccion,
      lat: lugar.lat,
      lon: lugar.lon,
    })
    .select('id')
    .single()

  if (error) {
    // Carrera: otro lo creó en simultáneo → reintentamos la búsqueda por place_id
    const { data: reintento } = await supabase
      .from('colegios')
      .select('id')
      .eq('osm_place_id', lugar.osm_place_id)
      .maybeSingle()
    return reintento?.id || null
  }

  return nuevo.id
}