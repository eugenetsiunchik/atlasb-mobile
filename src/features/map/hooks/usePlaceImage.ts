import React from 'react';

import { loadPlaceImageUrls } from '../services/placesService';
import type { PlaceMapItem } from '../types';

type PlaceImageState = {
  imageUrl: string | null;
  thumbnailUrl: string | null;
};

export function usePlaceImage(place: PlaceMapItem): PlaceImageState {
  const [imageState, setImageState] = React.useState<PlaceImageState>({
    imageUrl: place.imageUrl,
    thumbnailUrl: place.thumbnailUrl,
  });

  React.useEffect(() => {
    let isActive = true;

    setImageState({
      imageUrl: place.imageUrl,
      thumbnailUrl: place.thumbnailUrl,
    });

    void loadPlaceImageUrls(place).then(imageUrls => {
      if (!isActive || !imageUrls) {
        return;
      }

      setImageState(imageUrls);
    });

    return () => {
      isActive = false;
    };
  }, [place]);

  return imageState;
}
