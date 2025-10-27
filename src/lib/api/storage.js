// Mock storage/uploader for images/videos (previews only). Swap to Supabase Storage later.

export async function mockUpload(files) {
  // return array of preview URLs (Object URLs) to simulate uploads
  const out = [];
  for (const f of files) {
    out.push({
      name: f.name,
      size: f.size,
      type: f.type,
      url: URL.createObjectURL(f),
    });
  }
  return out;
}
