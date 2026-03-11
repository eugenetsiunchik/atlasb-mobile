import React from 'react';

import type { PlaceMapItem } from '../../map/types';
import { requestLocationPermission } from '../../map/services/locationPermissionService';
import { mapActions, selectUserLocation } from '../../map/store';
import { requireAuthForAction } from '../../../services/auth';
import { useAppDispatch, useAppSelector } from '../../../store';
import { runVisitCheckIn } from '../store';
import type { UserPlaceVisitRecord } from '../types';
import {
  evaluateVisitVerification,
  getPermissionDeniedVisitMessage,
} from '../services/visitVerificationService';

type VisitCheckInFeedback = {
  tone: 'danger' | 'success' | 'warning';
  text: string;
};

export function usePlaceVisitCheckIn(place: PlaceMapItem) {
  const dispatch = useAppDispatch();
  const userLocation = useAppSelector(selectUserLocation);

  const [feedback, setFeedback] = React.useState<VisitCheckInFeedback | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [manualVisitRecord, setManualVisitRecord] =
    React.useState<UserPlaceVisitRecord | null>(null);

  React.useEffect(() => {
    setFeedback(null);
    setManualVisitRecord(null);
    setIsSubmitting(false);
  }, [place.id]);

  const persistVisit = React.useCallback(
    async (visitRecord: UserPlaceVisitRecord, successMessage: string) => {
      setIsSubmitting(true);

      try {
        const result = await dispatch(
          runVisitCheckIn({
            placeId: place.id,
            visitRecord,
          }),
        );

        if (result.status === 'fulfilled') {
          setFeedback({
            text: successMessage,
            tone: 'success',
          });
          setManualVisitRecord(null);
          return result;
        }

        if (result.status === 'rejected') {
          setFeedback({
            text: result.errorMessage,
            tone: 'danger',
          });
          return result;
        }

        return result;
      } finally {
        setIsSubmitting(false);
      }
    },
    [dispatch, place.id],
  );

  const checkIn = React.useCallback(async () => {
    if (!requireAuthForAction('userPlaceState')) {
      return {
        reason: 'auth-required' as const,
        status: 'skipped' as const,
      };
    }

    setManualVisitRecord(null);

    dispatch(mapActions.locationPermissionSet('requested'));
    const permission = await requestLocationPermission();
    dispatch(mapActions.locationPermissionSet(permission));

    if (permission !== 'granted') {
      setFeedback({
        text: getPermissionDeniedVisitMessage(permission),
        tone: 'danger',
      });
      return {
        reason: 'permission-denied' as const,
        status: 'skipped' as const,
      };
    }

    const result = evaluateVisitVerification({
      location: userLocation,
      place,
    });

    if (result.status === 'weak-signal') {
      setFeedback({
        text: result.message,
        tone: 'warning',
      });
      return {
        reason: 'weak-signal' as const,
        status: 'skipped' as const,
      };
    }

    if (result.status === 'too-far') {
      setManualVisitRecord(result.record);
      setFeedback({
        text: result.message,
        tone: 'warning',
      });
      return {
        reason: 'too-far' as const,
        status: 'skipped' as const,
      };
    }

    return persistVisit(result.record, result.message);
  }, [dispatch, persistVisit, place, userLocation]);

  const markManualVisit = React.useCallback(async () => {
    if (!manualVisitRecord) {
      return {
        reason: 'noop' as const,
        status: 'skipped' as const,
      };
    }

    return persistVisit(
      manualVisitRecord,
      'Visit saved manually. It will appear in your history without GPS verification.',
    );
  }, [manualVisitRecord, persistVisit]);

  return React.useMemo(
    () => ({
      canMarkManualVisit: manualVisitRecord !== null,
      checkIn,
      feedback,
      isSubmitting,
      markManualVisit,
    }),
    [checkIn, feedback, isSubmitting, manualVisitRecord, markManualVisit],
  );
}
