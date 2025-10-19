type Props = { params: { id: string } };

export default function TopicDetailPage({ params }: Props) {
  return (
    <main style={{ padding: 24 }}>
      <h2>Topic Detail</h2>
      <p>ID: {params.id}</p>
      <p>ここにラリー（Q+Aセット）を時系列で表示します。</p>
    </main>
  );
}


