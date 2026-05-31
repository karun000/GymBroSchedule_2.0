import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Theme from '../Theme';

const UnitDropdown = ({ value, options, onChange, style }) => {
  const [open, setOpen] = useState(false);

  return (
    <View style={[styles.container, open && styles.containerOpen]}>
      <TouchableOpacity
        style={[styles.trigger, style]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.value}>{value}</Text>
        <Icon name="chevron-down" size={14} color={Theme.colors.textSub} />
      </TouchableOpacity>

      {open && (
        <>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setOpen(false)}
          />
          <View style={styles.box}>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => { onChange(item); setOpen(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.itemText, item === value && styles.itemTextActive]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  containerOpen: {
    zIndex: 30,
  },
  trigger: {
    minWidth: 84,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.inputBg,
    borderWidth: 1,
    borderColor: Theme.colors.inputBorder,
    borderRadius: Theme.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 6,
  },
  value: {
    flexShrink: 1,
    color: Theme.colors.text,
    fontSize: Theme.font.sm,
    fontWeight: '500',
  },
  backdrop: {
    position: 'absolute',
    left: -9999,
    right: -9999,
    top: -9999,
    bottom: -9999,
  },
  box: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 6,
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    minWidth: 140,
    maxWidth: 180,
    zIndex: 40,
    elevation: 12,
    overflow: 'hidden',
  },
  item: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.divider,
  },
  itemText: {
    color: Theme.colors.textSub,
    fontSize: Theme.font.base,
    fontWeight: '500',
  },
  itemTextActive: {
    color: Theme.colors.text,
    fontWeight: '700',
  },
});

export default UnitDropdown;
