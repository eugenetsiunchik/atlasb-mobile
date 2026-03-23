import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { usePlaceImage } from '../hooks';
import { usePlaceVisitCheckIn, useUserPlaceState } from '../../userPlace';
import type { PlaceMapItem } from '../types';

type PlaceDetailsSheetProps = {
  onClose: () => void;
  place: PlaceMapItem;
};

function getVisitSummary(params: {
  visitMethod: 'gps' | 'manual' | null;
  visitVerified: boolean | null;
  visited: boolean;
}) {
  const { visitMethod, visitVerified, visited } = params;

  if (!visited) {
    return null;
  }

  if (visitVerified) {
    return 'Verified by GPS';
  }

  if (visitMethod === 'manual') {
    return 'Marked manually';
  }

  return 'Visit saved';
}

export function PlaceDetailsSheet({ onClose, place }: PlaceDetailsSheetProps) {
  const userPlaceState = useUserPlaceState(place.id);
  const { canMarkManualVisit, checkIn, feedback, isSubmitting, markManualVisit } =
    usePlaceVisitCheckIn(place);
  const { imageUrl, thumbnailUrl } = usePlaceImage(place);

  const visitSummary = getVisitSummary(userPlaceState);
  const detailImageUrl = imageUrl ?? thumbnailUrl;

  return (
    <View className="rounded-t-3xl bg-slate-950 px-4 pb-8 pt-4">
      <View className="mb-4 h-1.5 w-12 self-center rounded-full bg-slate-700" />
      {detailImageUrl ? (
        <Image
          source={{ uri: detailImageUrl }}
          className="h-56 w-full rounded-3xl"
          resizeMode="cover"
        />
      ) : (
        <View className="h-56 w-full items-center justify-center rounded-3xl bg-slate-800">
          <Text className="text-sm font-medium text-slate-300">No preview image</Text>
        </View>
      )}

      <View className="mt-4 flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-2xl font-semibold text-white">{place.name}</Text>
          <Text className="mt-1 text-base text-slate-300">{place.region}</Text>
        </View>
        {visitSummary ? (
          <View className="rounded-full bg-emerald-500/18 px-3 py-1">
            <Text className="text-xs font-semibold uppercase tracking-wide text-emerald-200">
              {visitSummary}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="mt-4 rounded-2xl bg-slate-900 px-4 py-3">
        <Text className="text-sm font-medium text-slate-100">
          GPS radius: {Math.round(place.visitVerificationRadiusMeters)}m
        </Text>
        <Text className="mt-1 text-sm leading-6 text-slate-300">
          Tap check in when you are at the place. AtlasB uses your latest device location
          fix to verify the visit.
        </Text>
        {place.allowManualVisitMarking ? (
          <Text className="mt-2 text-sm leading-6 text-slate-400">
            Manual fallback is enabled for this place if GPS says you are too far away.
          </Text>
        ) : null}
      </View>

      {feedback ? (
        <View
          className={`mt-4 rounded-2xl px-4 py-3 ${
            feedback.tone === 'success'
              ? 'bg-emerald-500/16'
              : feedback.tone === 'danger'
                ? 'bg-rose-500/18'
                : 'bg-amber-500/18'
          }`}
        >
          <Text
            className={`text-sm leading-6 ${
              feedback.tone === 'success'
                ? 'text-emerald-100'
                : feedback.tone === 'danger'
                  ? 'text-rose-100'
                  : 'text-amber-100'
            }`}
          >
            {feedback.text}
          </Text>
        </View>
      ) : null}

      {!userPlaceState.visited ? (
        <Pressable
          className={`mt-6 rounded-2xl px-4 py-3 ${
            isSubmitting ? 'bg-amber-300/70' : 'bg-amber-400'
          }`}
          disabled={isSubmitting}
          onPress={checkIn}
        >
          <Text className="text-center text-base font-semibold text-slate-950">
            {isSubmitting ? 'Checking in...' : 'Check in'}
          </Text>
        </Pressable>
      ) : (
        <View className="mt-6 rounded-2xl bg-slate-900 px-4 py-3">
          <Text className="text-center text-base font-semibold text-slate-100">
            Visit already recorded
          </Text>
        </View>
      )}

      {!userPlaceState.visited && canMarkManualVisit ? (
        <Pressable
          className="mt-3 rounded-2xl border border-slate-700 px-4 py-3"
          disabled={isSubmitting}
          onPress={markManualVisit}
        >
          <Text className="text-center text-base font-semibold text-slate-100">
            Mark manually
          </Text>
        </Pressable>
      ) : null}

      <Pressable className="mt-3 rounded-2xl border border-slate-700 px-4 py-3" onPress={onClose}>
        <Text className="text-center text-base font-semibold text-slate-100">
          Close details
        </Text>
      </Pressable>
    </View>
  );
}
