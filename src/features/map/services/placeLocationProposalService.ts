import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from '@react-native-firebase/firestore';

import {
  getFirebaseConfigurationErrorMessage,
  getFirebaseFirestore,
  isFirebaseConfigured,
  logFirebaseError,
} from '../../../firebase';
import type { MapUserLocation, PlaceMapItem } from '../types';
export {
  evaluateLocationProposalEligibility,
  getPermissionDeniedLocationProposalMessage,
  type LocationProposalEligibilityResult,
} from './placeLocationProposalEligibility';

const PLACES_COLLECTION_NAME = 'places';
const LOCATION_PROPOSALS_SUBCOLLECTION_NAME = 'locationProposals';

type ProposalPlace = Pick<
  PlaceMapItem,
  | 'approximateRadiusMeters'
  | 'coordinatePrecision'
  | 'coordinateSource'
  | 'discoveryQuestLabel'
  | 'id'
  | 'name'
  | 'preciseLocationMissing'
  | 'region'
  | 'regionId'
>;

type ProposalUser = {
  displayName?: string | null;
  email?: string | null;
  uid: string;
};

export type SubmitPlaceLocationProposalResult =
  | { status: 'already-submitted' }
  | { status: 'submitted' };

function getPlaceLocationProposalDocument(placeId: string, uid: string) {
  return doc(
    collection(
      doc(collection(getFirebaseFirestore(), PLACES_COLLECTION_NAME), placeId),
      LOCATION_PROPOSALS_SUBCOLLECTION_NAME,
    ),
    uid,
  );
}

export async function submitPlaceLocationProposal(params: {
  location: MapUserLocation;
  place: ProposalPlace;
  user: ProposalUser;
}): Promise<SubmitPlaceLocationProposalResult> {
  const { location, place, user } = params;
  const documentPath = `${PLACES_COLLECTION_NAME}/${place.id}/${LOCATION_PROPOSALS_SUBCOLLECTION_NAME}/${user.uid}`;

  if (!isFirebaseConfigured()) {
    throw new Error(getFirebaseConfigurationErrorMessage());
  }

  const proposalDocument = getPlaceLocationProposalDocument(place.id, user.uid);

  try {
    const existingProposalSnapshot = await getDoc(proposalDocument);

    if (existingProposalSnapshot.exists()) {
      return {
        status: 'already-submitted',
      };
    }

    await setDoc(proposalDocument, {
      approximateRadiusMeters: place.approximateRadiusMeters,
      coordinatePrecision: place.coordinatePrecision,
      coordinateSource: place.coordinateSource,
      discoveryQuestLabel: place.discoveryQuestLabel,
      placeId: place.id,
      placeName: place.name,
      preciseLocationMissing: place.preciseLocationMissing,
      proposedCoordinate: {
        accuracyMeters: location.accuracyMeters,
        capturedAtMs: location.capturedAtMs,
        latitude: location.latitude,
        longitude: location.longitude,
      },
      region: place.region,
      regionId: place.regionId,
      reviewStatus: 'pending',
      submittedAt: serverTimestamp(),
      submittedBy: {
        displayName: user.displayName ?? null,
        email: user.email ?? null,
        uid: user.uid,
      },
      updatedAt: serverTimestamp(),
    });

    return {
      status: 'submitted',
    };
  } catch (error) {
    logFirebaseError(
      'Firestore submit place location proposal failed',
      {
        operation: 'setDoc',
        path: documentPath,
        placeId: place.id,
        uid: user.uid,
      },
      error,
    );
    throw error;
  }
}
