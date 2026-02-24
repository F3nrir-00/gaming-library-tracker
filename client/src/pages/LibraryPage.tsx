import Layout from '../components/layout/Layout';

export default function LibraryPage() {
  return (
    <Layout>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Game Library</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">Your game library will appear here.</p>
        </div>
      </div>
    </Layout>
  );
}