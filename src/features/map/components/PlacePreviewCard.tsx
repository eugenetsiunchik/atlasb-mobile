import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { usePlaceImage } from '../hooks';
import type { PlaceMapItem } from '../types';

type PlacePreviewCardProps = {
  onClose: () => void;
  onOpenDetails: () => void;
  place: PlaceMapItem;
};

export function PlacePreviewCard({
  onClose,
  onOpenDetails,
  place,
}: PlacePreviewCardProps) {
  const { imageUrl, thumbnailUrl } = usePlaceImage(place);
  const previewImageUrl = thumbnailUrl ?? imageUrl;
  const isApproximatePlace = place.coordinatePrecision === 'approximate';

  return (
    <View className="rounded-3xl bg-slate-950/96 p-3 shadow-lg">
      <View className="flex-row items-start gap-3">
        <View className="h-24 w-24 overflow-hidden rounded-2xl bg-slate-800">
          {previewImageUrl ? (
            <Image
              source={{ uri: previewImageUrl }}
              className="h-full w-full"
              resizeMode="cover"
            />
          ) : (
            <View className="h-full w-full items-center justify-center bg-slate-800">
              <Text className="px-2 text-center text-xs font-semibold text-slate-300">
                No image
              </Text>
            </View>
          )}
        </View>
        <View className="flex-1 gap-2">
          <View className="gap-1">
            {isApproximatePlace ? (
              <View className="self-start rounded-full bg-sky-500/20 px-2.5 py-1">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.8px] text-sky-100">
                  Approximate pin
                </Text>
              </View>
            ) : null}
            <Text className="text-lg font-semibold text-white" numberOfLines={2}>
              {place.name}
            </Text>
            <Text className="text-sm text-slate-300" numberOfLines={1}>
              {place.region}
            </Text>
            {isApproximatePlace ? (
              <Text className="text-xs leading-5 text-slate-400" numberOfLines={2}>
                {place.discoveryQuestLabel ?? 'Help AtlasB find the real location.'}
              </Text>
            ) : null}
          </View>
          <View className="flex-row gap-2">
            <Pressable
              className="flex-1 rounded-2xl bg-amber-400 px-3 py-2.5"
              onPress={onOpenDetails}
            >
              <Text className="text-center text-sm font-semibold text-slate-950">
                {isApproximatePlace ? 'Open quest' : 'Open details'}
              </Text>
            </Pressable>
            <Pressable
              className="rounded-2xl border border-slate-700 px-3 py-2.5"
              onPress={onClose}
            >
              <Text className="text-sm font-medium text-slate-200">Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
