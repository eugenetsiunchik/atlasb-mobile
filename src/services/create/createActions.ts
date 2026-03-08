import { Alert } from 'react-native';

import type { AuthActionType } from '../../types';
import { requireAuthForAction } from '../auth';

export type CreateActionOption = 'createPost' | 'suggestEdit';

type CreateActionConfig = {
  actionType: AuthActionType;
  description: string;
  message: string;
  title: string;
};

const createActionConfigs: Record<CreateActionOption, CreateActionConfig> = {
  createPost: {
    actionType: 'uploadPost',
    description: 'Create post',
    message: 'Authenticated users can continue into the upload flow from here.',
    title: 'Post flow',
  },
  suggestEdit: {
    actionType: 'suggestEdit',
    description: 'Suggest edit',
    message:
      'Authenticated users can continue into the edit suggestion flow from here.',
    title: 'Suggest edit',
  },
};

export const createActionOptions = (
  Object.entries(createActionConfigs) as Array<
    [CreateActionOption, CreateActionConfig]
  >
).map(([id, config]) => ({
  description: config.description,
  id,
}));

export function runCreateAction(option: CreateActionOption) {
  const config = createActionConfigs[option];

  if (!requireAuthForAction(config.actionType)) {
    return false;
  }

  Alert.alert(config.title, config.message);
  return true;
}

export function handleCreatePostAction() {
  return runCreateAction('createPost');
}

export function handleSuggestEditAction() {
  return runCreateAction('suggestEdit');
}
