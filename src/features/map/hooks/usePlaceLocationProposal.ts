import React from 'react';

import { requireAuthForAction } from '../../../services/auth';
import {
  mapActions,
  runUserPlaceMutation,
  selectCurrentUser,
  selectUserLocation,
  useAppDispatch,
  useAppSelector,
} from '../../../store';
import { requestLocationPermission } from '../services/locationPermissionService';
import type { PlaceMapItem } from '../types';
import {
  evaluateLocationProposalEligibility,
  getPermissionDeniedLocationProposalMessage,
  submitPlaceLocationProposal,
} from '../services/placeLocationProposalService';

type PlaceLocationProposalFeedback = {
  tone: 'danger' | 'success' | 'warning';
  text: string;
};

export function usePlaceLocationProposal(place: PlaceMapItem) {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const userLocation = useAppSelector(selectUserLocation);
  const [feedback, setFeedback] = React.useState<PlaceLocationProposalFeedback | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    setFeedback(null);
    setIsSubmitting(false);
  }, [place.id]);

  const submitPreciseLocation = React.useCallback(async () => {
    if (!requireAuthForAction('suggestEdit')) {
      return {
        reason: 'auth-required' as const,
        status: 'skipped' as const,
      };
    }

    if (!place.preciseLocationMissing) {
      return {
        reason: 'noop' as const,
        status: 'skipped' as const,
      };
    }

    dispatch(mapActions.locationPermissionSet('requested'));
    const permission = await requestLocationPermission();
    dispatch(mapActions.locationPermissionSet(permission));

    if (permission !== 'granted') {
      setFeedback({
        text: getPermissionDeniedLocationProposalMessage(permission),
        tone: 'danger',
      });
      return {
        reason: 'permission-denied' as const,
        status: 'skipped' as const,
      };
    }

    const locationEligibility = evaluateLocationProposalEligibility({
      location: userLocation,
    });

    if (locationEligibility.status === 'weak-signal') {
      setFeedback({
        text: locationEligibility.message,
        tone: 'warning',
      });
      return {
        reason: 'weak-signal' as const,
        status: 'skipped' as const,
      };
    }

    if (!currentUser?.uid) {
      setFeedback({
        text: 'Sign in to submit a precise location.',
        tone: 'danger',
      });
      return {
        reason: 'auth-required' as const,
        status: 'skipped' as const,
      };
    }

    setIsSubmitting(true);

    try {
      const result = await submitPlaceLocationProposal({
        location: locationEligibility.coordinates,
        place,
        user: currentUser,
      });

      if (result.status === 'already-submitted') {
        void dispatch(
          runUserPlaceMutation({
            mutation: 'markDiscovered',
            placeId: place.id,
          }),
        );
        setFeedback({
          text: 'You already submitted a precise location for this place. We will review it soon.',
          tone: 'warning',
        });
        return result;
      }

      void dispatch(
        runUserPlaceMutation({
          mutation: 'markDiscovered',
          placeId: place.id,
        }),
      );
      setFeedback({
        text: 'Precise location submitted. Thanks for helping AtlasB pin this place.',
        tone: 'success',
      });
      return result;
    } catch (error) {
      setFeedback({
        text:
          error instanceof Error
            ? error.message
            : 'Unable to submit a precise location right now.',
        tone: 'danger',
      });
      return {
        reason: 'submission-failed' as const,
        status: 'rejected' as const,
      };
    } finally {
      setIsSubmitting(false);
    }
  }, [currentUser, dispatch, place, userLocation]);

  return React.useMemo(
    () => ({
      feedback,
      isSubmitting,
      submitPreciseLocation,
    }),
    [feedback, isSubmitting, submitPreciseLocation],
  );
}
