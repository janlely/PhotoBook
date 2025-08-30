import { create } from 'zustand';

interface Photo {
  id: number;
  title: string;
  url: string;
}

interface StoreState {
  photos: Photo[];
  fetchPhotos: () => Promise<void>;
}

const useStore = create<StoreState>((set) => ({
  photos: [],
  fetchPhotos: async () => {
    try {
      // 这里只是示例，实际应用中会调用API
      const mockPhotos = [
        { id: 1, title: 'Nature', url: 'https://picsum.photos/200/300?nature' },
        { id: 2, title: 'City', url: 'https://picsum.photos/200/300?city' },
      ];
      set({ photos: mockPhotos });
    } catch (error) {
      console.error('Failed to fetch photos:', error);
    }
  },
}));

export default useStore;
