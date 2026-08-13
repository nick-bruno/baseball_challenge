import { ResultsClient } from "./ResultsClient";

export default async function ResultsPage({
  params,
}: PageProps<"/room/[code]/results">) {
  const { code } = await params;
  return <ResultsClient code={code} />;
}
