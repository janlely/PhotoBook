import React from 'react';
import useStore from '../store/useStore';

const StoreTest: React.FC = () => {
  const {
    albums,
    loading,
    errors,
    fetchAlbums
  } = useStore();

  React.useEffect(() => {
    console.log('StoreTest mounted, current state:', {
      albums: albums.data.length,
      loading,
      errors
    });
  }, []);

  const handleTestFetch = async () => {
    console.log('Testing fetchAlbums...');
    try {
      await fetchAlbums(true);
      console.log('fetchAlbums completed');
    } catch (error) {
      console.error('fetchAlbums failed:', error);
    }
  };

  return (
    <div className="p-4 border rounded bg-gray-50">
      <h3 className="text-lg font-semibold mb-4">Store Test</h3>

      <div className="space-y-2 mb-4">
        <p><strong>Albums count:</strong> {albums.data.length}</p>
        <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
        <p><strong>Errors:</strong> {Object.keys(errors).length > 0 ? JSON.stringify(errors) : 'None'}</p>
      </div>

      <button
        onClick={handleTestFetch}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        disabled={loading['albums']}
      >
        {loading['albums'] ? 'Loading...' : 'Test Fetch Albums'}
      </button>

      {albums.data.length > 0 && (
        <div className="mt-4">
          <h4 className="font-semibold">Albums:</h4>
          <ul className="list-disc list-inside">
            {albums.data.map(album => (
              <li key={album.id}>{album.title}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default StoreTest;