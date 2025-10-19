export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main style={{ padding: 24 }}>
      <h2>Topic Detail</h2>
      <p>ID: {id}</p>
      <p>ここにラリー（Q+Aセット）を時系列で表示します。</p>
    </main>
  );
}


