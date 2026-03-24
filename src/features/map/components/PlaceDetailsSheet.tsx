import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { usePlaceImage, usePlaceLocationProposal } from '../hooks';
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

function formatApproximateRadius(value: number | null) {
  if (!value) {
    return 'the marked area';
  }

  if (value >= 1000) {
    const kilometers = value / 1000;
    return `${Number.isInteger(kilometers) ? kilometers : kilometers.toFixed(1)} km radius`;
  }

  return `${Math.round(value)}m radius`;
}

export function PlaceDetailsSheet({ onClose, place }: PlaceDetailsSheetProps) {
  const userPlaceState = useUserPlaceState(place.id);
  const { canMarkManualVisit, checkIn, feedback, isSubmitting, markManualVisit } =
    usePlaceVisitCheckIn(place);
  const {
    feedback: proposalFeedback,
    isSubmitting: isSubmittingProposal,
    submitPreciseLocation,
  } = usePlaceLocationProposal(place);
  const { imageUrl, thumbnailUrl } = usePlaceImage(place);

  const visitSummary = getVisitSummary(userPlaceState);
  const detailImageUrl = imageUrl ?? thumbnailUrl;
  const isApproximatePlace = place.coordinatePrecision === 'approximate';
  const approximateRadiusLabel = formatApproximateRadius(place.approximateRadiusMeters);
  const statusBadgeLabel = isApproximatePlace
    ? userPlaceState.discovered
      ? 'Location submitted'
      : 'Discovery quest'
    : visitSummary;
  const activeFeedback = isApproximatePlace ? proposalFeedback : feedback;

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
          {isApproximatePlace ? (
            <Text className="mt-2 text-sm leading-6 text-slate-400">
              {place.discoveryQuestLabel ?? 'Help AtlasB discover the real location for this place.'}
            </Text>
          ) : null}
        </View>
        {statusBadgeLabel ? (
          <View
            className={`rounded-full px-3 py-1 ${
              isApproximatePlace ? 'bg-sky-500/18' : 'bg-emerald-500/18'
            }`}
          >
            <Text
              className={`text-xs font-semibold uppercase tracking-wide ${
                isApproximatePlace ? 'text-sky-100' : 'text-emerald-200'
              }`}
            >
              {statusBadgeLabel}
            </Text>
          </View>
        ) : null}
      </View>

      <View
        className={`mt-4 rounded-2xl px-4 py-3 ${
          isApproximatePlace ? 'bg-sky-500/10' : 'bg-slate-900'
        }`}
      >
        {isApproximatePlace ? (
          <>
            <Text className="text-sm font-medium text-sky-100">
              Approximate search area: {approximateRadiusLabel}
            </Text>
            <Text className="mt-1 text-sm leading-6 text-slate-300">
              This pin marks a likely area, not the confirmed spot. Explore around the marked
              location and submit your current GPS fix when you reach the real place.
            </Text>
            <Text className="mt-2 text-sm leading-6 text-slate-400">
              AtlasB stores your proposed coordinates for review before the public pin moves.
            </Text>
          </>
        ) : (
          <>
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
          </>
        )}
      </View>

      {activeFeedback ? (
        <View
          className={`mt-4 rounded-2xl px-4 py-3 ${
            activeFeedback.tone === 'success'
              ? 'bg-emerald-500/16'
              : activeFeedback.tone === 'danger'
                ? 'bg-rose-500/18'
                : 'bg-amber-500/18'
          }`}
        >
          <Text
            className={`text-sm leading-6 ${
              activeFeedback.tone === 'success'
                ? 'text-emerald-100'
                : activeFeedback.tone === 'danger'
                  ? 'text-rose-100'
                  : 'text-amber-100'
            }`}
          >
            {activeFeedback.text}
          </Text>
        </View>
      ) : null}

      {isApproximatePlace ? (
        userPlaceState.discovered ? (
          <View className="mt-6 rounded-2xl bg-sky-500/14 px-4 py-3">
            <Text className="text-center text-base font-semibold text-sky-100">
              Precise location already submitted
            </Text>
          </View>
        ) : (
          <Pressable
            className={`mt-6 rounded-2xl px-4 py-3 ${
              isSubmittingProposal ? 'bg-sky-300/60' : 'bg-sky-400'
            }`}
            disabled={isSubmittingProposal}
            onPress={submitPreciseLocation}
          >
            <Text className="text-center text-base font-semibold text-slate-950">
              {isSubmittingProposal ? 'Submitting precise location...' : 'Submit precise location'}
            </Text>
          </Pressable>
        )
      ) : (
        <>
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
        </>
      )}

      <Pressable className="mt-3 rounded-2xl border border-slate-700 px-4 py-3" onPress={onClose}>
        <Text className="text-center text-base font-semibold text-slate-100">
          Close details
        </Text>
      </Pressable>
    </View>
  );
}
