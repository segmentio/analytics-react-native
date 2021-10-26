import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Modal = () => {
  return (
    <View style={styles.page}>
      <Text style={styles.text}>Hello! 👋</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#262e4f',
  },
  text: {
    color: '#fff',
    fontSize: 24,
  },
});

export default Modal;
