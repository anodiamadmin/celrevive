import '@testing-library/jest-dom';

HTMLCanvasElement.prototype.getContext = () => ({
  drawImage: jest.fn(),
});
HTMLCanvasElement.prototype.toDataURL = () => 'data:image/jpeg;base64,mockphoto';