import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import ModalComponent from './Modal';
import Button from './Button';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface ProfileMenuProps {
  style?: any;
}

const ProfileMenu: React.FC<ProfileMenuProps> = ({ style }) => {
  const [visible, setVisible] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();

  const handleLogout = () => {
    setVisible(false);
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    await logout();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
    setShowLogoutModal(false);
  };

  const getRoleLabel = () => {
    if (!user) return '';
    switch (user.role) {
      case 'superadmin':
        return 'Super Admin';
      case 'cattleFeedOwner':
        return 'Cattle Feed Owner';
      case 'milkTruckOwner':
        return 'Milk Truck Owner';
      case 'milkTruckDriver':
        return 'Milk Truck Driver';
      case 'cattleFeedTruckOwner':
        return 'Cattle Feed Truck Owner';
      case 'cattleFeedTruckDriver':
        return 'Cattle Feed Truck Driver';
      case 'cattleFeedSeller':
        return 'Cattle Feed Seller';
      default:
        return user.role || 'User';
    }
  };

  if (!user) return null;

  return (
    <>
      <TouchableOpacity
        style={[styles.menuButton, style]}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.menuIconContainer}>
          <View style={styles.menuIconLine} />
          <View style={styles.menuIconLine} />
          <View style={styles.menuIconLine} />
        </View>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{user.name || 'User'}</Text>
                <Text style={styles.profileRole}>{getRoleLabel()}</Text>
                {user.phoneNumber && (
                  <Text style={styles.profilePhone}>{user.phoneNumber}</Text>
                )}
              </View>
            </View>

            <View style={styles.menuDivider} />

            <View style={styles.menuItems}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setVisible(false);
                  // Profile navigation logic can be added here if a common profile screen exists
                }}
              >
                <Text style={styles.menuItemIcon}>👤</Text>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemText}>Profile</Text>
                  <Text style={styles.menuItemSubtext}>View & edit account</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setVisible(false);
                }}
              >
                <Text style={styles.menuItemIcon}>⚙️</Text>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemText}>Settings</Text>
                  <Text style={styles.menuItemSubtext}>App preferences</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              <TouchableOpacity
                style={[styles.menuItem, styles.logoutItem]}
                onPress={handleLogout}
              >
                <Text style={styles.menuItemIcon}>🚪</Text>
                <Text style={[styles.menuItemText, styles.logoutText]}>Logout</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Premium Logout Modal */}
      <ModalComponent
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Logout"
        subtitle="Are you sure you want to end your session?"
        icon="👋"
        footer={
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Button
              onPress={() => setShowLogoutModal(false)}
              variant="secondary"
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
            <Button
              onPress={confirmLogout}
              style={{ flex: 1, backgroundColor: colors.error[600] }}
            >
              Logout
            </Button>
          </View>
        }
      >
        <Text style={{ color: colors.text.tertiary, textAlign: 'center', marginVertical: spacing.md }}>
          You will need to login again to access your dashboard.
        </Text>
      </ModalComponent>
    </>
  );
};

const styles = StyleSheet.create({
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuIconContainer: {
    width: 20,
    height: 16,
    justifyContent: 'space-between',
  },
  menuIconLine: {
    width: '100%',
    height: 2,
    backgroundColor: '#1f2937',
    borderRadius: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  profilePhone: {
    fontSize: 12,
    color: '#9ca3af',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  menuItems: {
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  menuItemIcon: {
    fontSize: 20,
    marginRight: 16,
    width: 28,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  menuItemSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  menuItemContent: {
    flex: 1,
  },
  logoutItem: {
    marginTop: 8,
  },
  logoutText: {
    color: '#dc2626',
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
});

export default ProfileMenu;

