import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { FilePlus2, PencilLine } from 'lucide-react-native';

import { createActionOptions, runCreateAction } from '../services/create';
import type { CreateActionOption } from '../services/create';
import { theme } from '../theme';

type CreateActionMenuProps = {
  bottomOffset: number;
  isDarkMode: boolean;
  onClose: () => void;
  visible: boolean;
};

const optionIcons: Record<CreateActionOption, typeof FilePlus2> = {
  createPost: FilePlus2,
  suggestEdit: PencilLine,
};

export function CreateActionMenu({
  bottomOffset,
  isDarkMode,
  onClose,
  visible,
}: CreateActionMenuProps) {
  const themeMode = isDarkMode ? 'dark' : 'light';
  const handleSelect = React.useCallback(
    (option: CreateActionOption) => {
      onClose();
      runCreateAction(option);
    },
    [onClose],
  );

  if (!visible) {
    return null;
  }

  const cardStyle = isDarkMode ? styles.menuDark : styles.menuLight;
  const iconColor = theme.createActionMenu.icon[themeMode];
  const secondaryTextColor = isDarkMode ? styles.subtitleDark : styles.subtitleLight;

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <Pressable
        accessibilityLabel="Close create menu"
        onPress={onClose}
        style={styles.backdrop}
      >
        <View pointerEvents="box-none" style={styles.modalContent}>
          <View pointerEvents="box-none" style={[styles.anchor, { bottom: bottomOffset }]}>
            <Pressable
              onPress={event => event.stopPropagation()}
              style={[styles.menuCard, cardStyle]}
            >
              <Text
                style={[
                  styles.title,
                  isDarkMode ? styles.titleDark : styles.titleLight,
                ]}
              >
                Quick actions
              </Text>
              <Text style={[styles.subtitle, secondaryTextColor]}>
                Choose what you want to do next.
              </Text>
              <View style={styles.optionList}>
                {createActionOptions.map(option => {
                  const Icon = optionIcons[option.id];

                  return (
                    <Pressable
                      accessibilityRole="button"
                      key={option.id}
                      onPress={() => handleSelect(option.id)}
                      style={({ pressed }) => [
                        styles.optionButton,
                        isDarkMode ? styles.optionButtonDark : styles.optionButtonLight,
                        pressed ? styles.optionButtonPressed : null,
                      ]}
                    >
                      <Icon color={iconColor} size={18} strokeWidth={2.2} />
                      <Text style={[styles.optionText, { color: iconColor }]}>
                        {option.description}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  anchor: {
    alignItems: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
  },
  backdrop: {
    backgroundColor: theme.createActionMenu.backdrop,
    flex: 1,
  },
  menuCard: {
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 24,
    maxWidth: 260,
    minWidth: 232,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  menuDark: {
    backgroundColor: theme.createActionMenu.menuBackground.dark,
    borderColor: 'rgba(148, 163, 184, 0.22)',
  },
  menuLight: {
    backgroundColor: theme.createActionMenu.menuBackground.light,
    shadowColor: theme.createActionMenu.shadow,
    shadowOffset: {
      height: 10,
      width: 0,
    },
    shadowOpacity: 0.14,
    shadowRadius: 18,
  },
  modalContent: {
    flex: 1,
  },
  optionButton: {
    alignItems: 'center',
    borderRadius: 18,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 13,
  },
  optionButtonDark: {
    backgroundColor: theme.createActionMenu.optionBackground.dark,
  },
  optionButtonLight: {
    backgroundColor: theme.createActionMenu.optionBackground.light,
  },
  optionButtonPressed: {
    opacity: 0.82,
  },
  optionList: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: theme.spacing.xs,
  },
  subtitleDark: {
    color: theme.createActionMenu.subtitle.dark,
  },
  subtitleLight: {
    color: theme.createActionMenu.subtitle.light,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  titleDark: {
    color: theme.createActionMenu.title.dark,
  },
  titleLight: {
    color: theme.createActionMenu.title.light,
  },
});
