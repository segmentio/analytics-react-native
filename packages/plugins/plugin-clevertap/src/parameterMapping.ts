export const mapTraits: { [key: string]: string } = {
  name: 'Name',
  birthday: 'DOB',
  avatar: 'Photo',
  gender: 'Gender',
  phone: 'Phone',
  email: 'Email',
};

export const transformMap: { [key: string]: (value: any) => any } = {
  event: (value: string) => {
    if (value in mapTraits) {
      return mapTraits[value];
    }
    return value;
  },
};
